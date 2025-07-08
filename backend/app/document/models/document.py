from couchdb.mapping import Document, TextField, DateTimeField


class DocumentModel(Document):
    _id = TextField()
    file_extension = TextField()
    title = TextField()
    created_at = DateTimeField()
    file_summary = TextField()


class ParagraphModel(Document):
    _id = TextField()
    text = TextField()
    summary = TextField()
    