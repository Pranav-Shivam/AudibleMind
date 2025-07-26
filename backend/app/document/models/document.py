from couchdb.mapping import Document, TextField, DateTimeField, IntegerField, BooleanField, ListField


class DocumentModel(Document):
    _id = TextField()
    file_extension = TextField()
    title = TextField()
    created_at = DateTimeField()
    file_summary = TextField()
    total_chunks = IntegerField()


class ParagraphModel(Document):
    _id = TextField()
    text = TextField()
    summary = TextField()


class ChunkModel(Document):
    _id = TextField()
    document_id = TextField()
    chunk_index = IntegerField()  # Dynamic chunk index based on content
    content = TextField()
    summary = TextField()  # Will be populated on-demand
    token_count = IntegerField()
    page_number = IntegerField()  # Page number for page-level chunking
    number_of_words = IntegerField()
    is_user_liked = BooleanField()
    heading = TextField()
    created_at = DateTimeField()
    updated_at = DateTimeField()
    bundle_index = IntegerField()
    bundle_id = TextField()
    bundle_text = TextField()
    bundle_summary = TextField()

class BundleModel(Document):
    _id = TextField()
    bundle_index = IntegerField()
    bundle_id = TextField()
    bundle_summary = TextField()
    created_at = DateTimeField()
    updated_at = DateTimeField()
    chunks_text = TextField()
    document_id = TextField()