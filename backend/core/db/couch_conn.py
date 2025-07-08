import couchdb
from core.configuration import *


class CouchDBConnection:
    def __init__(self):
        self.address = f"http://{COUCH_USERNAME}:{COUCH_PASSWORD}@{COUCH_HOST}:{COUCH_PORT}"
        self.conn = None

        try:
            self.conn = couchdb.Server(self.address)

            self.conn.version()
        except Exception as e:
            print("Error connecting couchdb: ", e)

    def get_db(self, db_name):
        try:
            db = self.conn[db_name]
            return db
        except couchdb.http.ResourceNotFound:
            return self.create_db(db_name)

    def create_db(self, db_name):
        db = self.conn.create(db_name)
        return db

    def save_to_db(self, db_name, doc):
        db = self.get_db(db_name)
        saved_doc = doc.store(db)
        doc_id = saved_doc.id
        return doc_id

    def get_doc_count(self, db_name):
        db = self.get_db(db_name)
        return db.info()['doc_count']

    def get_all_docs(self, db_name):
        db = self.get_db(db_name)
        docs = []
        for row in db.view('_all_docs', include_docs=True):
            if not row.id.startswith('_design'):
                docs.append(row.doc)
        return docs


    def delete_doc(self, db_name, doc_id):
        try:
            db = self.get_db(db_name)
            doc = db.get(doc_id)
            db.delete(doc)

            return doc
        except Exception as e:
            print("Error deleting document: ", e)

    def delete_database(self, db_name):
        if db_name in self.conn:
            self.conn.delete(db_name)
