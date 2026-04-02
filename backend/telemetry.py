from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
import os

def setup_telemetry(app):
    """
    Configure OpenTelemetry tracing for FastAPI + PostgreSQL
    Uses OTLP exporter (modern replacement for Jaeger exporter)
    """
    # Create resource (identifies your service)
    resource = Resource.create({
        "service.name": "brainbank-api",
        "service.version": "1.0.0",
        "deployment.environment": os.getenv("ENV", "development"),
    })

    # Set up tracer provider
    tracer_provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(tracer_provider)

    # Configure OTLP exporter (sends to Jaeger via OTLP protocol)
    otlp_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
        insecure=True  # Use insecure for local development
    )

    # Add span processor (batches spans before sending)
    tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

    # Instrument FastAPI (auto-traces all HTTP requests)
    FastAPIInstrumentor.instrument_app(app)

    # Instrument psycopg2 (auto-traces all database queries)
    Psycopg2Instrumentor().instrument()

    # Instrument logging (adds trace IDs to logs)
    LoggingInstrumentor().instrument(set_logging_format=True)

    print("OpenTelemetry tracing configured sending to Jaeger via OTLP")