# University Labs & Coursework Index

This directory contains university laboratory assignments, task requirements, architectural discussion notes, and submission reports for the *Object-Oriented Analysis and Design (AD)* course at UCU.

## Lab Directory Structure

```text
labs/
├── lab3/
│   └── DISCUSSION_ANSWERS.md   # Architectural answers on Stage 2 Serverless Migration & Cognito
├── lab5/
│   └── SUBMISSION_LAB5.md      # Report on Event-Driven Weekly Reports (EventBridge, SQS, S3, SES)
└── lab6/
    ├── LAB6_TASK.md            # Course task prompt & criteria from Moodle for Lab 6
    └── SUBMISSION_LAB6.md      # Submission report for Amazon Bedrock LLM Agenda Parser
```

### Summary of Labs
* **Lab 3 (Serverless Architecture & Cognito):** Migration from always-on ECS/ALB (Stage 0) to on-demand AWS Lambda with Function URLs, Amazon Cognito Hosted UI, and Google OAuth federation.
* **Lab 5 (Event-Driven Weekly Reports):** Asynchronous report generation using Amazon EventBridge Scheduler, SQS queuing, Lambda builders, S3 CSV storage, and Amazon SES delivery.
* **Lab 6 (LLM in the Product):** In-product AI integration using Amazon Bedrock to extract structured meeting/competition agendas from natural language text.
