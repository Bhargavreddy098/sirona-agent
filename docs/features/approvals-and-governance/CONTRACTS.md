# API Contracts & Schemas: Approvals & Governance

## 1. REST Endpoints

### 1.1 List Pending Approvals
- **Route**: `GET /api/v1/governance/approvals`
- **Controller**: [`apps/server/controllers/governanceController.js`](file:///apps/server/controllers/governanceController.js)
- **Response**: `200 OK`
```json
{
  "approvals": [
    {
      "id": "appr_01HXYZ112233",
      "conversationId": "conv_9876543210",
      "turnId": "turn_5544332211",
      "toolName": "execute_shell",
      "arguments": {
        "command": "git reset --hard HEAD~1"
      },
      "riskLevel": "high",
      "reason": "Destructive git command resets uncommitted changes.",
      "status": "pending",
      "createdAt": "2026-11-03T11:48:00.000Z",
      "expiresAt": "2026-11-03T11:58:00.000Z"
    }
  ]
}
```

### 1.2 Decide Approval (Approve or Reject)
- **Route**: `POST /api/v1/governance/approvals/:approvalId/decide`
- **Request Body**:
```json
{
  "decision": "approved",
  "comment": "Approved rollback for testing"
}
```
- **Response**: `200 OK`
```json
{
  "id": "appr_01HXYZ112233",
  "status": "approved",
  "decidedAt": "2026-11-03T11:48:30.000Z",
  "decidedBy": "local_user"
}
```
