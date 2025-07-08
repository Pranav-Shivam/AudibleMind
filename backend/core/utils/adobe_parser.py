import threading
import re
from core.utils.helper import *
from core.configuration import *

def parse(file_path, data):
    paras = []
    headers = []
    table_numbers = set()
    tables = []
    last_para = False
    for element in data:
        path = get_path(element)
        header_flag, level = is_header(path, level=True)


        if is_table(path):
            table_path = path.split('/')[0]
            if table_path == 'Table':
                table_no = 0
            else:
                table_no = int(re.search(r'\[(\d+)\]', table_path).group(1)) - 1

            if table_no not in table_numbers:
                table_numbers.add(table_no)
                json_data = read_csv_table(file_path, table_no)
                table_obj = {"json_data": "Header: \n" + "\n".join([h['text'] for h in headers]) + "\nCSV Data:" + json_data,
                             "table_no": table_no,
                             'page':element.get('page',0),
                             'header':"\n".join([h['text'] for h in headers])
                             }
                tables.append(table_obj)
                paras.append(table_obj)
            last_para = False


        elif header_flag:
            element['level'] = level
            last_para = False

            if headers and headers[-1]['level'] >= level:
                headers = remove_le_headers(headers, level)

            headers.append(element)

        elif is_para(path):
            if last_para:
                paras[-1]['para'] += "\n" + element['text']
            else:
                para_header = ""
                if headers:
                    para_header = "\n".join([h['text'] for h in headers])
                    para = para_header + "\n" + element['text']
                else:
                    para = element['text']
                paras.append({'para': para, 'page': element['page'],'header':para_header})
                last_para = True
        else:
            last_para = False



    tables = process_list_in_batches(tables, 4)
    paras = fill_tables(tables,paras)
    return paras


def fill_tables(tables,paras):
    for i, element in enumerate(paras):
        if element.get('table_no',-1) != -1:
            try:
                table_no = element['table_no']
                print(f"Inserting Table {table_no}")
                openai_table = tables[table_no]
                paras[i]['para'] = f"Table {paras[i]['table_no']}\n{openai_table}\n. "
            except Exception as e:
                print(f"Couldn't extract table {element.get('table_no','')}")

    return paras



def extract_number(input_string):
    numeric_chars = re.match(r'^\d+', input_string)

    if numeric_chars:
        extracted_numeric = numeric_chars.group()
        return extracted_numeric
    else:
        return None


def get_path(elem):
    elem = elem.get('path','')
    parts = elem.split('/')
    x = []
    for part in parts:
        if part.strip() and not any(map(lambda i:i in part,['Document','Sect','Aside'])):
            x.append(part)
    path = "/".join(x)
    return path


def read_csv_table(path, table_number):
    try:
        file_path = f"{path}/tables/fileoutpart{table_number}.csv"
        with open(file_path, 'r', encoding='utf-8') as file:
            data = file.read()
        return data
    except:
        return []


def is_header(path, level=False):
    path = path.lower()
    if path.startswith('title'):
        return True,0
    header = path.startswith("h")
    if header:
        l = extract_number(path[1:])
        try:
            l = int(l)
        except:
            l = None

        if level:
            return True, l
        else:
            return True, None
    return False, None


def remove_le_headers(headers, level):
    for i in range(len(headers)):
        if headers[i]['level'] >= level:
            return headers[:i]
    return headers


def is_table(path):
    return path.lower().startswith('table')

def is_title(path):
    return path.lower().startswith("title")

def is_para(path):
    return path.lower().startswith("p") or path.lower().startswith("l")





def process_list_in_batches(tables, batch_size):
    result = {}
    threads = []

    for i in range(0, len(tables), batch_size):
        tables_group = tables[i:i + batch_size]
        for table in tables_group:
            thread = threading.Thread(target=table_completion, args=(table['json_data'], table['table_no'],table['header'], result))
            thread.start()
            threads.append(thread)

        # Wait for all threads in the current batch to finish
        for thread in threads:
            thread.join()

        threads.clear()

    return result


def table_completion(csv_data, table_no,header, result):
    try:
        prompt = f"""Given the CSV table(s) data in triple backticks.
1. Write a Heading for CSV table.
2. Convert each row of table into `descriptive sentence` along with citations.
```{csv_data}```
    """
        messages = [
            {"role": "system", "content": prompt}
        ]
        response = openai_request(messages=messages,model=OPENAI_MODEL)

        response_query = response.content.strip().strip('\n')
        result[table_no] = header + "\n" + response_query
        print(f'Table {table_no} Parsed Using OpenAI...')
    except:
        result[table_no] = csv_data
        response_query = ""
    return response_query


def adjust_para_tokens(paras,k,min_outlier):

    if not paras:
        return [],[]

    # Split larger paragraphs
    k_limit_paras = []
    pages = []

    for para in paras:
        para_tokens = calculate_tokens(para['para'])
        if para_tokens > k + min_outlier:
            splitted_paras = split_para(para['para'],para['header'],k,min_outlier)
            k_limit_paras += splitted_paras
            pages += [para['page'] for i in range(len(splitted_paras))]
        else:
            k_limit_paras.append(para['para'])
            pages.append(para['page'])

    # Join smaller paragraphs
    new_paras = [""]
    last_para_tokens = 0
    new_pages = [pages[0]]
    c = 0
    for para in k_limit_paras:
        para_tokens = calculate_tokens(para)
        last_remaining = k - last_para_tokens
        if last_remaining + min_outlier > para_tokens:
            new_paras[-1] += para + "\n"
            last_para_tokens += para_tokens + 1
        else:
            new_paras.append(para)
            last_para_tokens = para_tokens
            new_pages.append(pages[c])

        c+=1
    return new_paras,new_pages

def split_para(para,header,k,min_outlier):
    sents = para.split(". ")
    paras = [""]
    rem_tokens = k
    for sent in sents:
        n_tokens = calculate_tokens(sent)
        if n_tokens < rem_tokens + min_outlier:
            paras[-1] += ". " + sent
            rem_tokens -= n_tokens + 1
        else:
            paras.append(header)
            rem_tokens = k - calculate_tokens(header)
            paras[-1] += ". " + sent
            rem_tokens -= n_tokens + 1

    return paras