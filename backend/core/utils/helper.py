from ast import literal_eval
import re
from core.configuration import *
import openai



def openai_request(messages,
                           model,
                           temperature=0,
                           json_format=False,
                           timeout=None):
    kwargs = {
        "model": model,
        "temperature": temperature,
        "messages": messages,
        "timeout": timeout
    }

    if json_format:
        kwargs["response_format"] = {"type": "json_object"}

    kwargs = {k:v for k,v in kwargs.items() if v}

    client = openai.OpenAI(api_key=OPENAI_KEY)
    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message


def parse_openai_dict(openai_output):
    try:
        openai_output = openai_output.replace("json","")
        dictionary_match = re.search(r'{[^}]*}', openai_output)
        if dictionary_match:
            dictionary_string = dictionary_match.group()
            try:
                try:
                    result_dict = literal_eval(openai_output)
                except:
                    result_dict = literal_eval(dictionary_string)
                return result_dict
            except ValueError as e:
                return {}
        else:
            return {}
    except Exception as e:
        print(f"Error parsing OpenAI output: {str(e)}")
        return {}
