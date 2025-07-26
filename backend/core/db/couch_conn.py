import couchdb
import time
from typing import Optional, List, Dict, Any
from core.configuration import config
from core.logger import logger, LoggerUtils


class CouchDBConnection:
    def __init__(self):
        self.address = f"http://{config.database.username}:{config.database.password}@{config.database.host}:{config.database.port}"
        self.conn = None
        
        logger.info(f"🗄️ Initializing CouchDB connection to {config.database.host}:{config.database.port}")
        
        start_time = time.time()
        try:
            self.conn = couchdb.Server(self.address)
            version = self.conn.version()
            
            connection_time = (time.time() - start_time) * 1000
            logger.success(f"✅ CouchDB connection established successfully - Version: {version}", 
                          extra={"connection_time": round(connection_time, 2), "version": version})
            
            LoggerUtils.log_performance("couchdb_connection", connection_time, 
                                      host=config.database.host, port=config.database.port)
                                      
        except Exception as e:
            connection_time = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to connect to CouchDB: {e}", 
                        extra={"connection_time": round(connection_time, 2)})
            LoggerUtils.log_error_with_context(e, {
                "component": "couchdb_connection",
                "host": config.database.host,
                "port": config.database.port,
                "connection_time": connection_time
            })

    def get_db(self, db_name: str):
        """Get database instance, create if doesn't exist"""
        start_time = time.time()
        try:
            db = self.conn[db_name]
            duration = (time.time() - start_time) * 1000
            
            logger.debug(f"📊 Retrieved existing database: {db_name}")
            LoggerUtils.log_db_operation("get_database", db_name, duration=duration)
            return db
            
        except couchdb.http.ResourceNotFound:
            duration = (time.time() - start_time) * 1000
            logger.info(f"🆕 Database {db_name} not found, creating new one")
            LoggerUtils.log_db_operation("database_not_found", db_name, duration=duration)
            return self.create_db(db_name)
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            LoggerUtils.log_error_with_context(e, {
                "operation": "get_database",
                "db_name": db_name,
                "duration": duration
            })
            raise

    def create_db(self, db_name: str):
        """Create a new database"""
        start_time = time.time()
        try:
            db = self.conn.create(db_name)
            duration = (time.time() - start_time) * 1000
            
            logger.success(f"✅ Created database: {db_name}")
            LoggerUtils.log_db_operation("create_database", db_name, duration=duration)
            return db
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to create database {db_name}: {e}")
            LoggerUtils.log_error_with_context(e, {
                "operation": "create_database",
                "db_name": db_name,
                "duration": duration
            })
            raise

    def save_to_db(self, db_name: str, doc) -> str:
        """Save document to database"""
        start_time = time.time()
        try:
            db = self.get_db(db_name)
            saved_doc = doc.store(db)
            doc_id = saved_doc.id
            duration = (time.time() - start_time) * 1000
            
            logger.info(f"💾 Saved document to {db_name}: {doc_id}")
            LoggerUtils.log_db_operation("save_document", db_name, doc_id=doc_id, duration=duration)
            return doc_id
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to save document to {db_name}: {e}")
            LoggerUtils.log_error_with_context(e, {
                "operation": "save_document",
                "db_name": db_name,
                "duration": duration
            })
            raise

    def get_doc_count(self, db_name: str) -> int:
        """Get document count for database"""
        start_time = time.time()
        try:
            db = self.get_db(db_name)
            count = db.info()['doc_count']
            duration = (time.time() - start_time) * 1000
            
            logger.debug(f"📊 Document count for {db_name}: {count}")
            LoggerUtils.log_db_operation("get_doc_count", db_name, duration=duration, doc_count=count)
            return count
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            LoggerUtils.log_error_with_context(e, {
                "operation": "get_doc_count",
                "db_name": db_name,
                "duration": duration
            })
            raise

    def get_all_docs(self, db_name: str) -> List[Dict[str, Any]]:
        """Get all documents from database"""
        start_time = time.time()
        try:
            db = self.get_db(db_name)
            docs = []
            for row in db.view('_all_docs', include_docs=True):
                if not row.id.startswith('_design'):
                    docs.append(row.doc)
            
            duration = (time.time() - start_time) * 1000
            logger.info(f"📚 Retrieved {len(docs)} documents from {db_name}")
            LoggerUtils.log_db_operation("get_all_docs", db_name, duration=duration, doc_count=len(docs))
            return docs
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            LoggerUtils.log_error_with_context(e, {
                "operation": "get_all_docs",
                "db_name": db_name,
                "duration": duration
            })
            raise

    def delete_doc(self, db_name: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Delete document from database"""
        start_time = time.time()
        try:
            db = self.get_db(db_name)
            doc = db.get(doc_id)
            if doc:
                db.delete(doc)
                duration = (time.time() - start_time) * 1000
                
                logger.info(f"🗑️ Deleted document {doc_id} from {db_name}")
                LoggerUtils.log_db_operation("delete_document", db_name, doc_id=doc_id, duration=duration)
                return doc
            else:
                logger.warning(f"⚠️ Document {doc_id} not found in {db_name}")
                return None
                
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to delete document {doc_id} from {db_name}: {e}")
            LoggerUtils.log_error_with_context(e, {
                "operation": "delete_document",
                "db_name": db_name,
                "doc_id": doc_id,
                "duration": duration
            })
            raise

    def delete_database(self, db_name: str) -> bool:
        """Delete entire database"""
        start_time = time.time()
        try:
            if db_name in self.conn:
                self.conn.delete(db_name)
                duration = (time.time() - start_time) * 1000
                
                logger.warning(f"🗑️ Deleted database: {db_name}")
                LoggerUtils.log_db_operation("delete_database", db_name, duration=duration)
                return True
            else:
                logger.warning(f"⚠️ Database {db_name} not found for deletion")
                return False
                
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to delete database {db_name}: {e}")
            LoggerUtils.log_error_with_context(e, {
                "operation": "delete_database",
                "db_name": db_name,
                "duration": duration
            })
            raise
        
    def get_doc_by_id(self, db_name: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get document by id"""
        start_time = time.time()
        try:
            db = self.get_db(db_name)
            doc = db.get(doc_id)
            duration = (time.time() - start_time) * 1000
            logger.info(f"📊 Retrieved document {doc_id} from {db_name}")
            LoggerUtils.log_db_operation("get_doc_by_id", db_name, doc_id=doc_id, duration=duration)
            return doc
        
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            LoggerUtils.log_error_with_context(e, {
                "operation": "get_doc_by_id",
                "db_name": db_name,
                "doc_id": doc_id,
                "duration": duration
            })
            raise
    
    def update_doc(self, db_name: str, doc_id: str, doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update document"""
        start_time = time.time()
        try:
            db = self.get_db(db_name)
            docs = db.get(doc_id)
            docs.update(doc)
            duration = (time.time() - start_time) * 1000
            logger.info(f"📊 Updated document {doc_id} in {db_name}")
            LoggerUtils.log_db_operation("update_document", db_name, doc_id=doc_id, duration=duration)
            return docs
        
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            LoggerUtils.log_error_with_context(e, {
                "operation": "update_document",
                "db_name": db_name,
                "doc_id": doc_id,
                "duration": duration
            })
            raise