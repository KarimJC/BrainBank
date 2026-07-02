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
    resource = Resource.create(
        {
            "service.name": "brainbank-api",
            "service.version": "1.0.0",
            "deployment.environment": os.getenv("ENV", "development"),
        }
    )

    # Set up tracer provider
    tracer_provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(tracer_provider)

    # Configure OTLP exporter (sends to Jaeger via OTLP protocol)
    otlp_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
        insecure=True,  # Use insecure for local development
    )
    tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

    FastAPIInstrumentor.instrument_app(app)

    Psycopg2Instrumentor().instrument()

    LoggingInstrumentor().instrument(set_logging_format=True)

    print("OpenTelemetry tracing configured sending to Jaeger via OTLP")
