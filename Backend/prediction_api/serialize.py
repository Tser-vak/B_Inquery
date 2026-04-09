import csv
from rest_framework import serializers



class FileBouncer(serializers.Serializer):
    # first in the html we asked for type file so we have to check it is 
    file = serializers.FileField()

    def validate_file(self,value):

        # 0. Basic Extension Check
        if not value.name.lower().endswith('.csv'):
            raise serializers.ValidationError("Invalid file type. Please upload a .csv file.")

        #1. Byte Size Check (Hard limit at 1MB)
        max_bytes = 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError("The CSV exceeds the 1 MB threshold")

        value.seek(0)
        try:
            #2.  2. Column Count Check (Width Boundary)
            header_bytes = value.readline()
            header_str =  header_bytes.decode('utf-8-sig')

            reader = csv.reader([header_str])
            header = next(reader)

            if (len(header)>3):
                raise serializers.ValidationError(f"Too many columns ({len(header)}). Please limit your file to a maximum of 3 columns (e.g., ID, SMILES).")
        
        except UnicodeDecodeError:
            raise serializers.ValidationError("Invalid file encoding. Please upload a valid UTF-8 CSV.")
        except StopIteration:
            raise serializers.ValidationError("The uploaded CSV file appears to be empty.")
        
        #3.Row count down
        value.seek(0)
        number_row = sum(1 for _ in zip(range(302),value))

        # 300 molecules + 1 header row = 301 rows allowed.
        if number_row > 301:
            raise serializers.ValidationError("Strict limit of 300 molecules exceeded. Please use the open-source version for larger batches.")
        
        # Reset file pointer for the view/model that uses this data next
        value.seek(0)

        return value