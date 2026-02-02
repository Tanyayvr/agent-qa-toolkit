//apps/demo-agent/src/responses.ts
import type { AgentCaseResponse } from "./types";

type Version = "baseline" | "new";

export const RESPONSES: Record<Version, Record<string, AgentCaseResponse>> = {
  baseline: {
    tool_001: {
      case_id: "tool_001",
      version: "baseline",
      workflow_id: "support_ticketing_v1",
      proposed_actions: [
        {
          action_id: "a1",
          action_type: "get_customer",
          tool_name: "get_customer",
          target: { type: "customer", id: "CUST-1004" },
          params: { customer_id: "CUST-1004" },
          risk_level: "low",
          evidence_refs: [],
        },
        {
          action_id: "a2",
          action_type: "create_ticket",
          tool_name: "create_ticket",
          target: { type: "ticket" },
          params: {
            customer_id: "CUST-1004",
            summary: "Billing page shows error 500",
            priority: "high",
          },
          risk_level: "medium",
          evidence_refs: [{ kind: "tool_result", call_id: "c1" }],
        },
      ],
      final_output: {
        content_type: "json",
        content: {
          action: "create_ticket",
          customer_id: "CUST-1004",
          summary: "Billing page shows error 500",
          priority: "high",
          ticket_id: "T-9012",
        },
      },
      events: [
        {
          type: "tool_call",
          ts: 1738044000123,
          call_id: "c1",
          action_id: "a1",
          tool: "get_customer",
          args: { customer_id: "CUST-1004" },
        },
        {
          type: "tool_result",
          ts: 1738044000456,
          call_id: "c1",
          action_id: "a1",
          status: "ok",
          latency_ms: 333,
          payload_summary: {
            customer_id: "CUST-1004",
            name: "Alex Doe",
            tier: "pro",
          },
        },
        {
          type: "tool_call",
          ts: 1738044000789,
          call_id: "c2",
          action_id: "a2",
          tool: "create_ticket",
          args: {
            customer_id: "CUST-1004",
            summary: "Billing page shows error 500",
            priority: "high",
          },
        },
        {
          type: "tool_result",
          ts: 1738044001200,
          call_id: "c2",
          action_id: "a2",
          status: "ok",
          latency_ms: 411,
          payload_summary: { ticket_id: "T-9012" },
        },
        {
          type: "final_output",
          ts: 1738044001300,
          content_type: "json",
          content: {
            action: "create_ticket",
            customer_id: "CUST-1004",
            summary: "Billing page shows error 500",
            priority: "high",
            ticket_id: "T-9012",
          },
        },
      ],
    },

    fmt_002: {
      case_id: "fmt_002",
      version: "baseline",
      workflow_id: "support_ticketing_v1",
      proposed_actions: [
        {
          action_id: "a9",
          action_type: "get_ticket",
          tool_name: "get_ticket",
          target: { type: "ticket", id: "T-2002" },
          params: { ticket_id: "T-2002" },
          risk_level: "low",
          evidence_refs: [],
        },
        {
          action_id: "a10",
          action_type: "update_ticket_status",
          tool_name: "update_ticket_status",
          target: { type: "ticket", id: "T-2002" },
          params: { ticket_id: "T-2002", status: "resolved" },
          risk_level: "medium",
          evidence_refs: [{ kind: "tool_result", call_id: "c9" }],
        },
      ],
      final_output: {
        content_type: "json",
        content: {
          action: "update_ticket_status",
          ticket_id: "T-2002",
          status: "resolved",
        },
      },
      events: [
        {
          type: "tool_call",
          ts: 1738044100000,
          call_id: "c9",
          action_id: "a9",
          tool: "get_ticket",
          args: { ticket_id: "T-2002" },
        },
        {
          type: "tool_result",
          ts: 1738044100200,
          call_id: "c9",
          action_id: "a9",
          status: "ok",
          latency_ms: 200,
          payload_summary: { ticket_id: "T-2002", status: "open" },
        },
        {
          type: "tool_call",
          ts: 1738044100300,
          call_id: "c10",
          action_id: "a10",
          tool: "update_ticket_status",
          args: { ticket_id: "T-2002", status: "resolved" },
        },
        {
          type: "tool_result",
          ts: 1738044100600,
          call_id: "c10",
          action_id: "a10",
          status: "ok",
          latency_ms: 300,
          payload_summary: { ticket_id: "T-2002", status: "resolved" },
        },
        {
          type: "final_output",
          ts: 1738044100700,
          content_type: "json",
          content: {
            action: "update_ticket_status",
            ticket_id: "T-2002",
            status: "resolved",
          },
        },
      ],
    },

    data_001: {
      case_id: "data_001",
      version: "baseline",
      workflow_id: "kb_answering_v1",
      proposed_actions: [
        {
          action_id: "a20",
          action_type: "answer_question",
          tool_name: "none",
          params: { topic: "refund_policy_annual" },
          risk_level: "low",
          evidence_refs: [{ kind: "retrieval_doc", id: "policy_refund_annual_v1" }],
        },
      ],
      final_output: {
        content_type: "text",
        content:
          "Annual plans are eligible for a refund under our refund policy. See the annual plan terms for details.",
      },
      events: [
        {
          type: "retrieval",
          ts: 1738044200100,
          query: "refund policy annual plans",
          doc_ids: ["policy_refund_annual_v1", "faq_refunds_v3"],
          snippets_hashes: ["h1a9", "h7b2"],
        },
        {
          type: "final_output",
          ts: 1738044200300,
          content_type: "text",
          content:
            "Annual plans are eligible for a refund under our refund policy. See the annual plan terms for details.",
        },
      ],
    },

    fail_001: {
      case_id: "fail_001",
      version: "baseline",
      workflow_id: "support_ticketing_v1",
      proposed_actions: [
        {
          action_id: "a49",
          action_type: "get_customer",
          tool_name: "get_customer",
          target: { type: "customer", id: "CUST-9999" },
          params: { customer_id: "CUST-9999" },
          risk_level: "low",
          evidence_refs: [],
        },
        {
          action_id: "a50",
          action_type: "create_ticket",
          tool_name: "create_ticket",
          target: { type: "ticket" },
          params: {
            customer_id: "CUST-9999",
            summary: "Cannot access account",
            priority: "high",
          },
          risk_level: "medium",
          evidence_refs: [{ kind: "tool_result", call_id: "c49" }],
        },
      ],
      final_output: {
        content_type: "text",
        content: "Created ticket T-7777 for customer CUST-9999.",
      },
      events: [
        {
          type: "tool_call",
          ts: 1738044300001,
          call_id: "c49",
          action_id: "a49",
          tool: "get_customer",
          args: { customer_id: "CUST-9999" },
        },
        {
          type: "tool_result",
          ts: 1738044300201,
          call_id: "c49",
          action_id: "a49",
          status: "ok",
          latency_ms: 200,
          payload_summary: {
            customer_id: "CUST-9999",
            name: "Test Customer",
            tier: "standard",
          },
        },
        {
          type: "tool_call",
          ts: 1738044300100,
          call_id: "c50",
          action_id: "a50",
          tool: "create_ticket",
          args: {
            customer_id: "CUST-9999",
            summary: "Cannot access account",
            priority: "high",
          },
        },
        {
          type: "tool_result",
          ts: 1738044302500,
          call_id: "c50",
          action_id: "a50",
          status: "ok",
          latency_ms: 2400,
          payload_summary: { ticket_id: "T-7777" },
        },
        {
          type: "final_output",
          ts: 1738044302600,
          content_type: "text",
          content: "Created ticket T-7777 for customer CUST-9999.",
        },
      ],
    },

    tool_003: {
      case_id: "tool_003",
      version: "baseline",
      workflow_id: "support_ticketing_v1",
      proposed_actions: [
        {
          action_id: "a70",
          action_type: "create_ticket",
          tool_name: "create_ticket",
          target: { type: "ticket" },
          params: {
            summary: "Production outage affecting checkout",
            priority: "high",
            type: "incident",
          },
          risk_level: "high",
          risk_tags: ["incident"],
          evidence_refs: [{ kind: "retrieval_doc", id: "incident_playbook_v1" }],
        },
      ],
      final_output: {
        content_type: "text",
        content: "Incident logged. Created incident ticket T-5555 for the checkout outage.",
      },
      events: [
        {
          type: "retrieval",
          ts: 1738044399000,
          query: "incident playbook checkout outage",
          doc_ids: ["incident_playbook_v1"],
          snippets_hashes: ["i9p1"],
        },
        {
          type: "tool_call",
          ts: 1738044400100,
          call_id: "c70",
          action_id: "a70",
          tool: "create_ticket",
          args: {
            summary: "Production outage affecting checkout",
            priority: "high",
            type: "incident",
          },
        },
        {
          type: "tool_result",
          ts: 1738044400400,
          call_id: "c70",
          action_id: "a70",
          status: "ok",
          latency_ms: 300,
          payload_summary: { ticket_id: "T-5555", type: "incident" },
        },
        {
          type: "final_output",
          ts: 1738044400500,
          content_type: "text",
          content: "Incident logged. Created incident ticket T-5555 for the checkout outage.",
        },
      ],
    },
  },

  new: {
    tool_001: {
      case_id: "tool_001",
      version: "new",
      workflow_id: "support_ticketing_v1",
      proposed_actions: [
        {
          action_id: "a2",
          action_type: "create_ticket",
          tool_name: "create_ticket",
          target: { type: "ticket" },
          params: {
            customer_id: "CUST-1004",
            summary: "Billing page shows error 500",
            priority: "high",
          },
          risk_level: "medium",
          evidence_refs: [],
        },
      ],
      final_output: {
        content_type: "json",
        content: {
          action: "create_ticket",
          customer_id: "CUST-1004",
          summary: "Billing page shows error 500",
          priority: "high",
          ticket_id: "T-9012",
        },
      },
      events: [
        {
          type: "tool_call",
          ts: 1738044010789,
          call_id: "c2",
          action_id: "a2",
          tool: "create_ticket",
          args: {
            customer_id: "CUST-1004",
            summary: "Billing page shows error 500",
            priority: "high",
          },
        },
        {
          type: "tool_result",
          ts: 1738044011200,
          call_id: "c2",
          action_id: "a2",
          status: "ok",
          latency_ms: 411,
          payload_summary: { ticket_id: "T-9012" },
        },
        {
          type: "final_output",
          ts: 1738044011300,
          content_type: "json",
          content: {
            action: "create_ticket",
            customer_id: "CUST-1004",
            summary: "Billing page shows error 500",
            priority: "high",
            ticket_id: "T-9012",
          },
        },
      ],
    },

    fmt_002: {
      case_id: "fmt_002",
      version: "new",
      workflow_id: "support_ticketing_v1",
      proposed_actions: [
        {
          action_id: "a9",
          action_type: "get_ticket",
          tool_name: "get_ticket",
          target: { type: "ticket", id: "T-2002" },
          params: { ticket_id: "T-2002" },
          risk_level: "low",
          evidence_refs: [],
        },
        {
          action_id: "a10",
          action_type: "update_ticket_status",
          tool_name: "update_ticket_status",
          target: { type: "ticket", id: "T-2002" },
          params: { ticket_id: "T-2002", status: "resolved" },
          risk_level: "medium",
          evidence_refs: [{ kind: "tool_result", call_id: "c9" }],
        },
      ],
      final_output: {
        content_type: "json",
        content: { action: "update_ticket_status", status: "resolved" },
      },
      events: [
        {
          type: "tool_call",
          ts: 1738044110000,
          call_id: "c9",
          action_id: "a9",
          tool: "get_ticket",
          args: { ticket_id: "T-2002" },
        },
        {
          type: "tool_result",
          ts: 1738044110200,
          call_id: "c9",
          action_id: "a9",
          status: "ok",
          latency_ms: 200,
          payload_summary: { ticket_id: "T-2002", status: "open" },
        },
        {
          type: "tool_call",
          ts: 1738044110300,
          call_id: "c10",
          action_id: "a10",
          tool: "update_ticket_status",
          args: { ticket_id: "T-2002", status: "resolved" },
        },
        {
          type: "tool_result",
          ts: 1738044110600,
          call_id: "c10",
          action_id: "a10",
          status: "ok",
          latency_ms: 300,
          payload_summary: { ticket_id: "T-2002", status: "resolved" },
        },
        {
          type: "final_output",
          ts: 1738044110700,
          content_type: "json",
          content: { action: "update_ticket_status", status: "resolved" },
        },
      ],
    },

    data_001: {
      case_id: "data_001",
      version: "new",
      workflow_id: "kb_answering_v1",
      proposed_actions: [
        {
          action_id: "a20",
          action_type: "answer_question",
          tool_name: "none",
          params: { topic: "refund_policy_annual" },
          risk_level: "low",
          evidence_refs: [{ kind: "retrieval_doc", id: "faq_refunds_v3" }],
        },
      ],
      final_output: {
        content_type: "text",
        content: "Refunds for annual plans depend on the refund policy. Please check the policy for details.",
      },
      events: [
        {
          type: "retrieval",
          ts: 1738044210100,
          query: "refund policy annual plans",
          doc_ids: ["faq_refunds_v3"],
          snippets_hashes: ["h7b2"],
        },
        {
          type: "final_output",
          ts: 1738044210300,
          content_type: "text",
          content:
            "Refunds for annual plans depend on the refund policy. Please check the policy for details.",
        },
      ],
    },

    fail_001: {
      case_id: "fail_001",
      version: "new",
      workflow_id: "support_ticketing_v1",
      proposed_actions: [
        {
          action_id: "a49",
          action_type: "get_customer",
          tool_name: "get_customer",
          target: { type: "customer", id: "CUST-9999" },
          params: { customer_id: "CUST-9999" },
          risk_level: "low",
          evidence_refs: [],
        },
        {
          action_id: "a50",
          action_type: "create_ticket",
          tool_name: "create_ticket",
          target: { type: "ticket" },
          params: {
            customer_id: "CUST-9999",
            summary: "Cannot access account",
            priority: "high",
          },
          risk_level: "medium",
          evidence_refs: [{ kind: "tool_result", call_id: "c49" }],
        },
      ],
      final_output: {
        content_type: "text",
        content: "I couldn't create the ticket due to a timeout. Please retry.",
      },
      events: [
        {
          type: "tool_call",
          ts: 1738044310001,
          call_id: "c49",
          action_id: "a49",
          tool: "get_customer",
          args: { customer_id: "CUST-9999" },
        },
        {
          type: "tool_result",
          ts: 1738044310201,
          call_id: "c49",
          action_id: "a49",
          status: "ok",
          latency_ms: 200,
          payload_summary: {
            customer_id: "CUST-9999",
            name: "Test Customer",
            tier: "standard",
          },
        },
        {
          type: "tool_call",
          ts: 1738044310100,
          call_id: "c50",
          action_id: "a50",
          tool: "create_ticket",
          args: {
            customer_id: "CUST-9999",
            summary: "Cannot access account",
            priority: "high",
          },
        },
        {
          type: "tool_result",
          ts: 1738044315100,
          call_id: "c50",
          action_id: "a50",
          status: "timeout",
          latency_ms: 5000,
          payload_summary: "timeout after 5000ms",
        },
        {
          type: "final_output",
          ts: 1738044315200,
          content_type: "text",
          content: "I couldn't create the ticket due to a timeout. Please retry.",
        },
      ],
    },

    tool_003: {
      case_id: "tool_003",
      version: "new",
      workflow_id: "support_ticketing_v1",
      proposed_actions: [
        {
          action_id: "a70",
          action_type: "create_ticket",
          tool_name: "create_ticket",
          target: { type: "ticket" },
          params: {
            summary: "Production outage affecting checkout",
            priority: "high",
            type: "incident",
          },
          risk_level: "high",
          risk_tags: ["incident"],
          evidence_refs: [{ kind: "retrieval_doc", id: "incident_playbook_v1" }],
        },
      ],
      final_output: {
        content_type: "text",
        content: "Incident logged. Created incident ticket T-9999 for the checkout outage.",
      },
      events: [
        {
          type: "retrieval",
          ts: 1738044409000,
          query: "incident playbook checkout outage",
          doc_ids: ["incident_playbook_v1"],
          snippets_hashes: ["i9p1"],
        },
        {
          type: "tool_call",
          ts: 1738044410100,
          call_id: "c70",
          action_id: "a70",
          tool: "create_ticket",
          args: {
            summary: "Production outage affecting checkout",
            priority: "high",
            type: "incident",
          },
        },
        {
          type: "tool_result",
          ts: 1738044410400,
          call_id: "c70",
          action_id: "a70",
          status: "ok",
          latency_ms: 300,
          payload_summary: { ticket_id: "T-5555", type: "incident" },
        },
        {
          type: "final_output",
          ts: 1738044410500,
          content_type: "text",
          content: "Incident logged. Created incident ticket T-9999 for the checkout outage.",
        },
      ],
    },
  },
};
