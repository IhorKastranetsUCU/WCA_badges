import os

from app.core.config import settings


def main() -> None:
    model_id = os.environ.get("PARSER_MODEL", settings.PARSER_MODEL)
    print("=== Amazon Bedrock LLM Hello ===")
    print(f"Configured Model ID: {model_id}")
    print(f"Region: {settings.AWS_REGION}")
    prompt = "In one sentence: what is an ISO week?"
    print(f"Prompt: '{prompt}'\n")

    # Try Anthropic Messages API on Bedrock (bedrock-mantle) if anthropic model
    if model_id.startswith("anthropic."):
        try:
            from anthropic import AnthropicBedrockMantle

            client = AnthropicBedrockMantle(aws_region=settings.AWS_REGION)
            msg = client.messages.create(
                model=model_id,
                max_tokens=1024,
                output_config={"effort": "low"},
                messages=[{"role": "user", "content": prompt}],
            )
            answer = next(b.text for b in msg.content if b.type == "text")
            print("Answer (AnthropicBedrockMantle):")
            print(answer)
            print(f"\nStop reason: {msg.stop_reason}")
            print(
                f"Usage: input_tokens={msg.usage.input_tokens}, output_tokens={msg.usage.output_tokens}"
            )
            return
        except Exception as e:
            print(f"Note: AnthropicBedrockMantle call with '{model_id}' failed: {e}")
            print(
                "Demonstrating Converse API snippet with Amazon Nova Micro (as detailed in Part 1)..."
            )

    # Converse API snippet (Part 1)
    import boto3

    brt = boto3.client("bedrock-runtime", region_name=settings.AWS_REGION)
    converse_model = "amazon.nova-micro-v1:0"
    resp = brt.converse(
        modelId=converse_model,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={"maxTokens": 200},
    )
    answer = resp["output"]["message"]["content"][0]["text"]
    usage = resp["usage"]
    stop_reason = resp.get("stopReason")
    print(f"Answer (Converse API - {converse_model}):")
    print(answer)
    print(f"\nStop reason: {stop_reason}")
    print(
        f"Usage: input_tokens={usage.get('inputTokens')}, output_tokens={usage.get('outputTokens')}"
    )


if __name__ == "__main__":
    main()
