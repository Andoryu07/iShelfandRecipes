FROM python:3.13-slim

WORKDIR /backend

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY application ./application

CMD ["uvicorn", "application.main:application", "--host", "0.0.0.0", "--port", "8000"]
