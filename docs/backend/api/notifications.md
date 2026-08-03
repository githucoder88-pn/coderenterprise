# Notifications API

Base: `/dashboard/notifications`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `?page=1` | List notifications (paginated) |
| GET | `/unread-count` | Count of unread notifications |
| POST | `/:id/read` | Mark read |
| POST | `/read-all` | Mark all as read |

Notification types: `workflow_complete`, `task_assigned`, `checkpoint_created`,
`agent_failed`, `security_alert`, `billing_alert`, `provider_alert`, `message`, `error`.
