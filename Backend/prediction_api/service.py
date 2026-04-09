import os
import json
import numpy as np
import pandas as pd 
import warnings
from django.conf import settings
from rdkit import Chem
from rdkit.ML.Descriptors import MoleculeDescriptors
import onnxruntime as ort


warnings.filterwarnings('ignore', category=UserWarning, module='rdkit')
#warnings.filterwarnings('ignore', category=FutureWarning)

class PredictionJob: 
    # Application-scoped cache to eliminate disk I/O latency and repeated model loading
    _resource = None
    
    # Paths are defined directly on the class, no __init__ needed!
    _model_dir = os.path.join(settings.BASE_DIR, 'onxx_models')
    _paths = {
        'model': os.path.join(_model_dir, 'mao_prediction_pipeline.onnx'),
        'descriptors': os.path.join(_model_dir, 'significant_desc_names.json'),
    }

    @classmethod
    def get_resource(cls):
        #lets load the ml variables if not loaded
        if cls._resource is None:#Check if we have the cache of the models
            try:
                #Opens the descriptor file and saves the json content as a []
                with open(cls._paths['descriptors'],'r') as f:
                    # Load descriptor list from secure JSON
                    descriptors = json.load(f)
                #Starts the onxx model so then when we need we just do ort.run()                
                session=ort.InferenceSession(cls._paths['model'], providers=['CPUExecutionProvider'])
                #saves the data
                cls._resource = {'session' :session,
                                 'descriptors' : descriptors,
                                 'calc' : MoleculeDescriptors.MolecularDescriptorCalculator(descriptors),
                                 }
            #raises a log flag if there is a error.  
            except Exception as e:
                raise RuntimeError(f"Critical architecture failure: Unable to load ML resources. Error: {str(e)}") 
        return cls._resource
    
    @staticmethod
    def get_smile_columns(df):
        #get the Columns from the df
        columns=df.columns.to_list()

        # Tier 1: Lexical Heuristics
        common_names = {'smiles', 'canonical_smiles', 'structure', 'zincsmiles', 'compound_smiles'}

        #iritation through the columns 
        for col in columns :
            column_filt = str(col).strip().lower()
            if column_filt in common_names:
                return col

        #Tier 2: Empirical test
        text_columns = df.select_dtypes(include=['object', 'string']).columns
        
        #Check each column the first 10 row to see if there are smile string
        if not text_columns.empty:
            sample_df = df.head(10)
            smile_col = None
            highest_num = 0
            
            #Go through the 10 row and find if there is a smile
            for col in text_columns:
                sample = sample_df[col].dropna()
                valid_str = 0
                actual_num_row = len(sample)
                if actual_num_row == 0:
                    continue

                for items in sample:
                    if Chem.MolFromSmiles(str(items)) is not None:
                        valid_str += 1
                # 2. DYNAMIC THRESHOLD: Require at least 50% to be valid chemistry
                # (You can adjust this strictness depending on your needs!)
                required_matches = max(1, int(actual_num_row * 0.5))        
            #Keep only the smiles
                if  valid_str > highest_num and valid_str >= required_matches :
                    highest_num = valid_str
                    smile_col = col
        
            if smile_col:
                return smile_col
        raise ValueError("Could not automatically detect a valid SMILES column. Please name your structure column 'SMILES'.")
    
    @staticmethod
    def get_id(df, smile_col):
        #Grab the columns
        columns = df.columns.to_list()

        # Common variations of Mol_id or typical ID columns
        id_patterns = {
            'mol_id', 'molid', 'id', 'zinc_id', 'zincid', 'zinc_ids', 
            'compound_id', 'compoundid', 'compound_name', 'name', 
            'title', 'structure_id'
        }

        # Priority 1: Exact matches (after normalization)
        for col in columns:
            column_filt = str(col).strip().lower()
            if column_filt in id_patterns and col != smile_col:
                return col
            
        return None
    
    @classmethod
    def prediction(cls,csv_file):
        #gather the specif files needed for the classification
        resource = cls.get_resource()
        try:
            #upload the csv file ,# Explicitly use utf-8-sig to match the Serializer's BOM stripping
            df = pd.read_csv(csv_file , encoding='utf-8-sig')

        except Exception as e:
            raise ValueError(f" Failed to read the uploaded CSV file. Ensure it is a valid text format. ERROR : {str(e)}")

        if df.empty:
            raise ValueError("The CSV file is empty.")
        
        # 2. Use our new static methods via the 'cls' reference

        smile_column = cls.get_smile_columns(df)
        id_column = cls.get_id(df , smile_column)

        valid_rows = []
        valid_mol = []

        # 3. Sanitize and parse the chemistry

        for idx,rows in df.iterrows():
            mol = Chem.MolFromSmiles(str(rows[smile_column]))
            if mol :
                valid_mol.append(Chem.AddHs(mol))
                valid_rows.append(rows)

        if not valid_mol:
            raise ValueError("NO valid SMILE string found in the file.")        
          
        valid_smiles_df = pd.DataFrame(valid_rows)
        # Calculation & Scaling (Scaling is now handled inside the ONNX pipeline)
        calculate_descriptors = [resource['calc'].CalcDescriptors(mol) for mol in valid_mol]
        descriptors_df=pd.DataFrame(
            calculate_descriptors,
            columns = resource['descriptors'],
            index = valid_smiles_df.index,
        )

        numeric_cols = descriptors_df.select_dtypes(include= ['number']).columns
        #Here you need to add the median of the training !!!!
        descriptors_df[numeric_cols] = descriptors_df[numeric_cols].fillna(descriptors_df[numeric_cols].median())

        # 5. Prepare the data for ONNX (float32 is mandatory)
        X = descriptors_df[resource['descriptors']].values.astype(np.float32)

        # 6. Inference via ONNX Runtime
        input_name = resource['session'].get_inputs()[0].name

        # The RandomForestClassifier in ONNX returns two outputs: 
        # 1. Labels (class predictions)
        # 2. Probabilities (dictionary or array depending on conversion)

        outputs = resource['session'].run( None , {input_name : X})
        
    # In skl2onnx conversion of RandomForestClassifier:
        # outputs[0] is the prediction (Active/Not Active labels)
        # outputs[1] is a list of dictionaries with probabilities
        # Example: [{'Active': 0.8, 'Not Active': 0.2}, ...]
        
        # Let's extract probabilities safely. 
        # For classifiers, usually output[1] is the probabilities.
        # It's often a list of dictionaries.

        # 7. Extract probabilities

        prob = outputs[1]

        # Safely extract the probability of class 0 (Active) for each prediction.
        # Using .get(0, 0.0) ensures that if the key is somehow missing, it defaults to 0.0 instead of crashing the app.
        
        confidence_scores = np.array([p.get(0, 0.0) for p in prob])
    
        # 8. Formatting Output
        rename_map = {'smile_column' : 'SMILES'}
        if id_column : 
            rename_map['id_column'] = 'ID'

        cols_keep = [smile_column]
        if id_column:
            cols_keep.append(id_column) 

        results = valid_smiles_df[cols_keep].copy()
        results = results.rename(columns=rename_map)

        results['Predicted_Activity'] = np.where(confidence_scores >= 0.5, 'Active', 'Not Active')
        results['Confidence'] = confidence_scores


        return results 

         
         




    



