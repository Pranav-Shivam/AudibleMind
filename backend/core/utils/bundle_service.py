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
        print(bundle)
        
        return bundle
    
    def get_bundle_summary_by_bundle_id(self, bundle_id):
        bundle = self.couch_client.get_doc_by_id(COUCH_BUNDLE_DB_NAME, bundle_id)
        
        if not bundle:
            logger.error(f"Bundle not found for bundle_id: {bundle_id}")
            return None

        document_id = bundle.get('document_id')
        bundle_index = bundle.get('bundle_index')

        # Always fetch summaries from -1, current, +1
        summary_minus_1 = "This is the summary of the previous bundle: " + (self.couch_client.get_bundle_summary_by_doc_id_and_index(COUCH_BUNDLE_DB_NAME, document_id, bundle_index - 1) or "Not available")
        summary_current = "This is the summary of the current bundle: " + (bundle.get('bundle_summary') or "Not available")
        summary_plus_1 = "This is the summary of the next bundle: " + (self.couch_client.get_bundle_summary_by_doc_id_and_index(COUCH_BUNDLE_DB_NAME, document_id, bundle_index + 1) or "Not available")
        
        

        if summary_current:
            logger.info(f"Bundle summary already exists for bundle_id: {bundle_id}")
            logger.info(f"Summary minus 1: is found {f'Summary minus 1 found for bundle_id: {bundle_id} and bundle_index: {bundle_index - 1}' if summary_minus_1 else f'Summary minus 1 not found for bundle_id: {bundle_id} and bundle_index: {bundle_index - 1}'}")
            logger.info(f"Summary current: is found {f'Summary current found for bundle_id: {bundle_id} and bundle_index: {bundle_index}' if summary_current else f'Summary current not found for bundle_id: {bundle_id} and bundle_index: {bundle_index}'}")
            logger.info(f"Summary plus 1: is found {f'Summary plus 1 found for bundle_id: {bundle_id} and bundle_index: {bundle_index + 1}' if summary_plus_1 else f'Summary plus 1 not found for bundle_id: {bundle_id} and bundle_index: {bundle_index + 1}'}")
            
            complete_summary = f"""bundle_summary: A contextual window that includes summaries of:
   - Previous bundle (bundle_index - 1): {summary_minus_1}
   - Current bundle (bundle_index): {summary_current}
   - Next bundle (bundle_index + 1): {summary_plus_1}
   """
            return complete_summary

        # Generate if not present
        if bundle.get('chunks_text'):
            logger.info(f"Generating summary for bundle_id: {bundle_id} and bundle_index: {bundle_index}")
            summary_current = self.document_summary.get_bundle_summary(bundle['chunks_text'])
            bundle['bundle_summary'] = summary_current
            self.couch_client.update_doc(COUCH_BUNDLE_DB_NAME, bundle_id, bundle)
            return summary_minus_1 + summary_current + summary_plus_1
        else:
            logger.info(f"No chunks_text found for bundle_id: {bundle_id}")
            return None
        
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
    