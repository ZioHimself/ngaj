# Agent System Guide

## Overview

ngaj uses a multi-agent system for development:

1. **Test-Writer Agent**: Writes comprehensive tests from requirements
2. **Implementer Agent**: Implements code to pass tests
3. **Reviewer Agent**: Reviews code for quality and security

## Configuration

Agent configurations are in `.agents/config/agents.json`.

## Usage

See [Multi-Agent Workflow Documentation](../../.agents/README.md) for details.

## Prompts

Agent prompts are stored in `.agents/prompts/[agent-name]/`.

## Decision Logs

All agent decisions are logged in `.agents/logs/[agent-name]/decisions.jsonl`.
