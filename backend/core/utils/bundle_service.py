from core.ollama_setup.document_summary import DocumentSummarizer
from core.db.couch_conn import CouchDBConnection
from core.configuration import *
from core.logger import logger

class BundleService:
    def __init__(self):
        self.document_summary = DocumentSummarizer()
        self.couch_client = CouchDBConnection()
    
    def create_bundle(self, chunks):
        pass
    
    def get_bundle(self, bundle_id):
        pass
    
    def update_bundle(self, bundle_id, chunks):
        pass
    
    def get_bundle_summary_by_id(self, bundle_id):
        # get the bundle from the database
        bundle = self.couch_client.get_db(COUCH_BUNDLE_DB_NAME)
        
        
        return bundle
    
    def get_bundle_summary_by_bundle_id(self, bundle_id):
        bundle = self.couch_client.get_doc_by_id(COUCH_BUNDLE_DB_NAME, bundle_id)
        
        # Check if bundle already has a summary
        if bundle and bundle.get('bundle_summary'):
            logger.info(f"Bundle summary already exists for bundle_id: {bundle_id}")
            return bundle['bundle_summary']
        
        
        # Generate summary if not available
        if bundle and bundle.get('chunks_text'):
            logger.info(f"Generating summary for bundle_id: {bundle_id}")
            bundle_summary = self.document_summary.get_bundle_summary(bundle['chunks_text'])
            # Save the generated summary
            bundle['bundle_summary'] = bundle_summary
            self.couch_client.update_doc(COUCH_BUNDLE_DB_NAME, bundle_id, bundle)
            logger.info(f"Summary generated for bundle_id: {bundle_id}, summary length: {len(bundle_summary)}")
            return bundle_summary
        
        return None
    
    def set_bundle_summary(self, bundle_id, bundle_summary):
        bundle = self.couch_client.get_doc_by_id(COUCH_BUNDLE_DB_NAME, bundle_id)
        bundle['bundle_summary'] = bundle_summary
        self.couch_client.update_doc(COUCH_BUNDLE_DB_NAME, bundle_id, bundle)
        return bundle
    
    #we have to do the same for all the bundles in the database based on the document_id and update the bundle_summary in the database
    def get_all_bundles_by_document_id(self, document_id):
        bundles = self.couch_client.get_all_docs(COUCH_BUNDLE_DB_NAME)
        for bundle in bundles:
            if bundle['document_id'] == document_id:
                bundle_summary = self.document_summary.get_bundle_summary(bundle['chunks_text'])
                bundle['bundle_summary'] = bundle_summary
                self.couch_client.update_doc(COUCH_BUNDLE_DB_NAME, bundle['_id'], bundle)
        return bundles
    