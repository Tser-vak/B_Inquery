import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser , FormParser 
from rest_framework import status
from .service import PredictionJob
from .serialize import FileBouncer

#0. Create a logger instance in this exact path 
logs=logging.getLogger(__name__)

class PredictView(APIView):
    parser_classes = (MultiPartParser, FormParser)
     
     # 1. Create the post instace
    def post(self,request,*args,**kwargs):
        # 2. Pass the file to the bouncer
        serializer = FileBouncer(data=request.data)

        #3. validate that the file exist and passed the bouncer
        if not serializer.is_valid():
            logs.error(f"File validation failed: {serializer.errors}")
            return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)
        
        #4. If the file is valid, we can pass it to the prediction job
        validated_file = getattr(serializer , 'validated_data', {}).get('file')

        #check if the file is not None
        if validated_file is None:
            logs.error("File validation failed: No file provided after validation.")
            return Response({"error": "No file found in validated data."}, status=status.HTTP_400_BAD_REQUEST)
        
        #5. Create a prediction job instance and pass the file to it
        try:
           predict = PredictionJob()
           
           result_df = predict.prediction(validated_file)

           return Response(result_df.to_dict(orient='records'), status = status.HTTP_200_OK)
        
        except ValueError as ve:
            return Response({"error": str(ve)}, status = status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            logs.exception(f"An unexpected error occurred during prediction: {str(e)}")
            return Response({"error": "An unexpected error occurred during prediction."}, status = status.HTTP_500_INTERNAL_SERVER_ERROR)
        