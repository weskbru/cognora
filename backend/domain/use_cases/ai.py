import os
import json
import time
import urllib.parse
import google.generativeai as genai


class AIUseCases:
    def __init__(self, api_key: str, upload_dir: str):
        if not api_key:
            raise ValueError("GEMINI_API_KEY não configurada")
        genai.configure(api_key=api_key)
        self.upload_dir = upload_dir
        self.model = genai.GenerativeModel(
            "gemini-2.0-flash",
            generation_config={"response_mime_type": "application/json"},
        )

    def _url_to_path(self, file_url: str) -> str:
        filename = os.path.basename(urllib.parse.urlparse(file_url).path)
        path = os.path.join(self.upload_dir, filename)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Arquivo não encontrado: {filename}")
        return path

    def invoke_llm(self, prompt: str, file_urls: list, response_json_schema: dict) -> dict:
        if not file_urls:
            raise ValueError("Nenhum arquivo fornecido")

        filepath = self._url_to_path(file_urls[0])

        uploaded = genai.upload_file(filepath, mime_type="application/pdf")
        for _ in range(30):
            if uploaded.state.name != "PROCESSING":
                break
            time.sleep(2)
            uploaded = genai.get_file(uploaded.name)

        if uploaded.state.name != "ACTIVE":
            raise RuntimeError(f"Falha no upload do arquivo: {uploaded.state.name}")

        full_prompt = (
            f"{prompt}\n\n"
            f"Responda APENAS com JSON válido seguindo exatamente este schema:\n"
            f"{json.dumps(response_json_schema, ensure_ascii=False)}"
        )

        response = self.model.generate_content([uploaded, full_prompt])

        try:
            genai.delete_file(uploaded.name)
        except Exception:
            pass

        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text)
