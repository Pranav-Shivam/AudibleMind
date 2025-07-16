from couchdb.mapping import Document, TextField, DateTimeField, IntegerField


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
    