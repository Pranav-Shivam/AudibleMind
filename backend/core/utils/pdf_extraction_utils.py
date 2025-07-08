from adobe.pdfservices.operation.auth.credentials import Credentials
from adobe.pdfservices.operation.exception.exceptions import ServiceApiException, ServiceUsageException, SdkException
from adobe.pdfservices.operation.execution_context import ExecutionContext
from adobe.pdfservices.operation.io.file_ref import FileRef
from adobe.pdfservices.operation.pdfops.extract_pdf_operation import ExtractPDFOperation
from adobe.pdfservices.operation.pdfops.options.extractpdf.extract_pdf_options import ExtractPDFOptions, ExtractRenditionsElementType, TableStructureType
from adobe.pdfservices.operation.pdfops.options.extractpdf.extract_element_type import ExtractElementType
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from core.configuration import *
from PyPDF2 import PdfWriter, PdfReader
import PyPDF2
import os
import os.path
import uuid
import zipfile
import json
import shutil
from core.utils.adobe_parser import parse

ADOBE_ZIP_UPLODE_PATH = "temp/adobe_docments"
ADOBE_PARSED_DOCUMENT_PATH = "batch/parsed_documents"

def extract_zip(zip_file_path, extract_to):
    if not os.path.exists(extract_to):
        os.makedirs(extract_to)
    
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)

def adobe_extractor(input_path, output_path):
    print('Adobe Extract API Started....')
    try:
        if not os.path.exists(output_path):
            os.makedirs(output_path)

        #Initial setup, create credentials instance.
        credentials = Credentials.service_principal_credentials_builder().with_client_id(ADOBE_CLIENT_ID).with_client_secret(ADOBE_CLIENT_SECRET).build()

        #Create an ExecutionContext using credentials and create a new operation instance.
        execution_context = ExecutionContext.create(credentials)
        extract_pdf_operation = ExtractPDFOperation.create_new()

        #Set operation input from a source file.
        source = FileRef.create_from_local_file(input_path)
        extract_pdf_operation.set_input(source)

        #Build ExtractPDF options and set them into the operation
        extract_pdf_options: ExtractPDFOptions = ExtractPDFOptions.builder() \
            .with_elements_to_extract([ExtractElementType.TEXT, ExtractElementType.TABLES]) \
            .with_table_structure_format(TableStructureType.CSV) \
            .build()
        extract_pdf_operation.set_options(extract_pdf_options)

        #Execute the operation.
        result: FileRef = extract_pdf_operation.execute(execution_context)
        temp_file = result._file_path
        file_name = str(uuid.uuid4())
        shutil.copy(temp_file,os.path.abspath(f"{output_path}/{file_name}_sdk_result.zip"))
        result._file_path = os.path.abspath(f"{output_path}/{file_name}_sdk_result.zip")
        #Save the result to the specified location.
        result.save_as(f"{output_path}/{file_name}.zip")
        extract_zip(f"{output_path}/{file_name}.zip", f"{output_path}/{file_name}")
        print('Successfully Extracted Data (Adobe)...')
        return output_path+ '/' + file_name, file_name
    except (ServiceApiException, ServiceUsageException, SdkException) as e:
        raise Exception("Could Not Extract Data, Adobe Extract API.", str(e))

def adobe_parse_data(file_path, create_file=False):
    print(f'Parsing Text Data {file_path}...')
    structured_data_dict = []
    with open(file_path + '/structuredData.json') as json_file:
        data = json.load(json_file)
        for element in data['elements']:
            text = element.get('Text', "")
            path = element.get('Path', "")
            page = element.get('Page', "")
            folder = path.split("/")[3]
            if text and path and not any(folder.startswith(prefix) for prefix in ['Footnote']):
                structured_data_dict.append({'text': text, 'path': path,'page':page})
    if create_file:
        with open(file_path + '/extracted_structured_data.json', 'w') as file:
            json.dump(structured_data_dict, file, indent=4)
    return structured_data_dict






def load_json_file(path):
    with open(path, 'r') as file:
        json_data = json.load(file)
    return json_data


def extract_and_save_pages(input_pdf_path, output_pdf_path, pages_to_extract):
    # Open the input PDF file and create a new output PDF file
    with open(input_pdf_path, 'rb') as input_pdf_file, open(output_pdf_path, 'wb') as output_pdf_file:
        pdf_reader = PyPDF2.PdfReader(input_pdf_file)
        pdf_writer = PyPDF2.PdfWriter()

        # Add the specified number of pages to the output PDF
        for page_num in range(pages_to_extract):
            page = pdf_reader.pages[page_num]
            pdf_writer.add_page(page)

        # Write the modified PDF to the output file
        pdf_writer.write(output_pdf_file)

    print(f"Extracted and saved the first {pages_to_extract} pages to {output_pdf_path}")


def text_to_pdf(input_file, output_pdf):
    # Read the input text file
    if not os.path.exists(ADOBE_PARSED_DOCUMENT_PATH):
        os.makedirs(ADOBE_PARSED_DOCUMENT_PATH)
    with open(input_file, 'r', encoding='utf-8') as file:
        input_text = file.read()

    # Create a PDF document
    doc = SimpleDocTemplate(output_pdf, pagesize=letter)
    
    # Define styles
    styles = getSampleStyleSheet()
    normal_style = styles['Normal']

    # Create a list to hold the content
    story = []

    # Convert content to paragraphs and add to the story
    paragraphs = input_text.split('\n')  # Assuming paragraphs are separated by two newlines
    for para in paragraphs:
        story.append(Paragraph(para, normal_style))
        story.append(Spacer(1, 12))  # Add some space between paragraphs

    # Build the PDF document
    doc.build(story)

    print(f'PDF saved as {output_pdf}')

def pdf_extractor(input_path, output_path):
    adobe_json_path, file_name = adobe_extractor(input_path, output_path)
    structured_data = adobe_parse_data(adobe_json_path, create_file=True)
    parsed_data = parse(adobe_json_path,structured_data)
    # parsed_data = extract(adobe_json_path, structured_data, create_file=CREATE_PARSED_PDF_FILE)
    return parsed_data, file_name, structured_data

def extract_pdf_using_adobe(file, document_id, page_include_list=None): 
    
    if not os.path.exists(ADOBE_ZIP_UPLODE_PATH):
        os.makedirs(ADOBE_ZIP_UPLODE_PATH)

    with open(f'{ADOBE_ZIP_UPLODE_PATH}/{document_id}.pdf', 'wb') as f:
        file.file.seek(0)
        if page_include_list:

            pdf_writer = PdfWriter()
            pdf_reader = PdfReader(file.file)

            for page_num in range(max(page_include_list)+1):
                if page_num in page_include_list:
                    pdf_writer.add_page(pdf_reader.pages[page_num])  # Page numbers are 1-based
                else:
                    pdf_writer.add_blank_page()

            pdf_writer.write(f)
        else:
            f.write(file.file.read())

    data, file_id, structured_data = pdf_extractor(f'{ADOBE_ZIP_UPLODE_PATH}/{document_id}.pdf', ADOBE_ZIP_UPLODE_PATH)
    
    return data, structured_data