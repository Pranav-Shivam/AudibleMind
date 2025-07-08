from core.db.couch_conn import CouchDBConnection
from core.configuration import *
from core.utils.helper import generate_uid
from core.utils.pdf_extraction_utils import extract_pdf_using_adobe
from core.utils.adobe_parser import adjust_para_tokens
from app.document.models.document import *
from datetime import datetime
import json

class DocumentService:
    def __init__(self):
        self.couch_client = CouchDBConnection()
        self.db = self.couch_client.get_db(COUCH_PDF_DB_NAME)
        
    def upload_file(self, user_prompt, file):
        file.file.seek(0)
        data = file.file.read()
        filename = file.filename
        title, file_extension = os.path.splitext(filename)
        
        # save doc object to couchdb
        document_id = generate_uid()
        doc_model = DocumentModel(_id=document_id,
                                  title=title,
                                  file_extension=file_extension,
                                  created_at=datetime.now(),
                                  )

        document_id = self.couch_client.save_to_db(COUCH_DOCUMENT_DB_NAME, doc_model)
        print(f"Document {title} -> {document_id} saved to db successfully")

        # upload pdf to couchdb
        doc = self.create_pdf_doc(file_name=filename)
        self.db.put_attachment(doc,data,filename=filename,content_type="application/pdf")
        print("File uploaded to couchdb successfully")

        # extract pdf using adobe
        data, structured_data = extract_pdf_using_adobe(file, document_id)
        paras,pages = adjust_para_tokens(data,MAX_PARA_LENGTH,30)

        file_summary = "generate_file_summary(paras)" # TODO:- pranav
        doc_model.file_summary = file_summary
        self.couch_client.save_to_db(COUCH_DOCUMENT_DB_NAME, doc_model)

        for para in paras:
            pid = generate_uid()
            doc = ParagraphModel(_id=pid,
                                 text=para)
            self.couch_client.save_to_db(COUCH_PARAGRAPH_DB_NAME, doc)
        print(f"{len(paras)} extracted successfully!")
        
        with open('user_prompt.json','w') as f:
            json.dump({'user_prompt': user_prompt}, f)
        print("user prompt saved")
        return document_id

    
    def create_pdf_doc(self, file_name):
        doc_id, _ = self.db.save({'pdf_name':file_name})
        return self.db[doc_id]