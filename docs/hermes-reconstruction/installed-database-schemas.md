# Installed database schema observations

Read-only schema inspection; no conversation, credential or other application rows queried. Separate transaction per database. Full SQL, columns, indexes and foreign keys are in catalogs/installed-database-schemas.json.

## C:\Users\bharg\AppData\Local\hermes\state.db

SQLite user_version: 0; schema_version: 76; journal: wal.

### async_delegations

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| delegation_id | TEXT | 0 | None | 1 | 0 |
| origin_session | TEXT | 1 | None | 0 | 0 |
| origin_ui_session_id | TEXT | 1 | '' | 0 | 0 |
| parent_session_id | TEXT | 0 | None | 0 | 0 |
| state | TEXT | 1 | None | 0 | 0 |
| dispatched_at | REAL | 1 | None | 0 | 0 |
| completed_at | REAL | 0 | None | 0 | 0 |
| updated_at | REAL | 1 | None | 0 | 0 |
| event_json | TEXT | 0 | None | 0 | 0 |
| result_json | TEXT | 0 | None | 0 | 0 |
| delivery_state | TEXT | 1 | 'pending' | 0 | 0 |
| delivery_attempts | INTEGER | 1 | 0 | 0 | 0 |
| delivered_at | REAL | 0 | None | 0 | 0 |
| owner_pid | INTEGER | 0 | None | 0 | 0 |
| owner_started_at | INTEGER | 0 | None | 0 | 0 |
| task_json | TEXT | 0 | None | 0 | 0 |
| delivery_claim | TEXT | 0 | None | 0 | 0 |
| delivery_claimed_at | REAL | 0 | None | 0 | 0 |
| origin_session_id | TEXT | 1 | '' | 0 | 0 |
| owner_execution_id | TEXT | 0 | None | 0 | 0 |

Indexes: idx_async_delegations_delivery, sqlite_autoindex_async_delegations_1 (unique).
Foreign keys: [].

### compression_locks

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| session_id | TEXT | 0 | None | 1 | 0 |
| holder | TEXT | 1 | None | 0 | 0 |
| acquired_at | REAL | 1 | None | 0 | 0 |
| expires_at | REAL | 1 | None | 0 | 0 |

Indexes: idx_compression_locks_expires, sqlite_autoindex_compression_locks_1 (unique).
Foreign keys: [].

### conversation_generations

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| source | TEXT | 1 | None | 1 | 0 |
| session_key | TEXT | 1 | None | 2 | 0 |
| generation | INTEGER | 1 | 0 | 0 | 0 |

Indexes: sqlite_autoindex_conversation_generations_1 (unique).
Foreign keys: [].

### gateway_heartbeats

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| backend_id | TEXT | 0 | None | 1 | 0 |
| pid | INTEGER | 1 | None | 0 | 0 |
| started_at | REAL | 1 | None | 0 | 0 |
| last_heartbeat | REAL | 1 | None | 0 | 0 |
| profile | TEXT | 1 | '' | 0 | 0 |
| host | TEXT | 1 | '' | 0 | 0 |

Indexes: sqlite_autoindex_gateway_heartbeats_1 (unique).
Foreign keys: [].

### gateway_hygiene_state

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| session_key | TEXT | 0 | None | 1 | 0 |
| failure_streak | INTEGER | 1 | 0 | 0 | 0 |

Indexes: sqlite_autoindex_gateway_hygiene_state_1 (unique).
Foreign keys: [].

### gateway_routing

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| scope | TEXT | 1 | '' | 1 | 0 |
| session_key | TEXT | 1 | None | 2 | 0 |
| entry_json | TEXT | 1 | None | 0 | 0 |
| updated_at | REAL | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_gateway_routing_1 (unique).
Foreign keys: [].

### messages

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| id | INTEGER | 0 | None | 1 | 0 |
| session_id | TEXT | 1 | None | 0 | 0 |
| role | TEXT | 1 | None | 0 | 0 |
| content | TEXT | 0 | None | 0 | 0 |
| tool_call_id | TEXT | 0 | None | 0 | 0 |
| tool_calls | TEXT | 0 | None | 0 | 0 |
| tool_name | TEXT | 0 | None | 0 | 0 |
| effect_disposition | TEXT | 0 | None | 0 | 0 |
| timestamp | REAL | 1 | None | 0 | 0 |
| token_count | INTEGER | 0 | None | 0 | 0 |
| finish_reason | TEXT | 0 | None | 0 | 0 |
| reasoning | TEXT | 0 | None | 0 | 0 |
| reasoning_content | TEXT | 0 | None | 0 | 0 |
| reasoning_details | TEXT | 0 | None | 0 | 0 |
| codex_reasoning_items | TEXT | 0 | None | 0 | 0 |
| codex_message_items | TEXT | 0 | None | 0 | 0 |
| platform_message_id | TEXT | 0 | None | 0 | 0 |
| observed | INTEGER | 0 | 0 | 0 | 0 |
| _compressed_summary | INTEGER | 1 | 0 | 0 | 0 |
| active | INTEGER | 1 | 1 | 0 | 0 |
| compacted | INTEGER | 1 | 0 | 0 | 0 |
| api_content | TEXT | 0 | None | 0 | 0 |
| display_kind | TEXT | 0 | None | 0 | 0 |
| display_metadata | TEXT | 0 | None | 0 | 0 |
| display_identity | BLOB | 0 | None | 0 | 0 |
| display_order | INTEGER | 0 | None | 0 | 0 |
| message_uid | TEXT | 0 | None | 0 | 0 |
| absorbed_message_uids | TEXT | 0 | None | 0 | 0 |
| tool_call_uids | TEXT | 0 | None | 0 | 0 |
| tool_call_uid | TEXT | 0 | None | 0 | 0 |

Indexes: idx_messages_session_uid, idx_messages_active_null, idx_messages_display_identity, idx_messages_display_backfill, idx_messages_display_page, idx_messages_session_active, idx_messages_platform_msg_id, idx_messages_assistant_calls_by_session, idx_messages_session_id, idx_messages_session.
Foreign keys: [{"id": 0, "seq": 0, "table": "sessions", "from": "session_id", "to": "id", "on_update": "NO ACTION", "on_delete": "NO ACTION", "match": "NONE"}].

### messages_fts

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| content |  | 0 | None | 0 | 0 |
| tool_name |  | 0 | None | 0 | 0 |
| tool_calls |  | 0 | None | 0 | 0 |
| messages_fts |  | 0 | None | 0 | 1 |
| rank |  | 0 | None | 0 | 1 |

Indexes: .
Foreign keys: [].

### messages_fts_config

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| k |  | 1 | None | 1 | 0 |
| v |  | 0 | None | 0 | 0 |

Indexes: sqlite_autoindex_messages_fts_config_1 (unique).
Foreign keys: [].

### messages_fts_data

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| id | INTEGER | 0 | None | 1 | 0 |
| block | BLOB | 0 | None | 0 | 0 |

Indexes: .
Foreign keys: [].

### messages_fts_docsize

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| id | INTEGER | 0 | None | 1 | 0 |
| sz | BLOB | 0 | None | 0 | 0 |

Indexes: .
Foreign keys: [].

### messages_fts_idx

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| segid |  | 1 | None | 1 | 0 |
| term |  | 1 | None | 2 | 0 |
| pgno |  | 0 | None | 0 | 0 |

Indexes: sqlite_autoindex_messages_fts_idx_1 (unique).
Foreign keys: [].

### messages_fts_trigram

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| content |  | 0 | None | 0 | 0 |
| tool_name |  | 0 | None | 0 | 0 |
| messages_fts_trigram |  | 0 | None | 0 | 1 |
| rank |  | 0 | None | 0 | 1 |

Indexes: .
Foreign keys: [].

### messages_fts_trigram_config

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| k |  | 1 | None | 1 | 0 |
| v |  | 0 | None | 0 | 0 |

Indexes: sqlite_autoindex_messages_fts_trigram_config_1 (unique).
Foreign keys: [].

### messages_fts_trigram_data

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| id | INTEGER | 0 | None | 1 | 0 |
| block | BLOB | 0 | None | 0 | 0 |

Indexes: .
Foreign keys: [].

### messages_fts_trigram_docsize

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| id | INTEGER | 0 | None | 1 | 0 |
| sz | BLOB | 0 | None | 0 | 0 |

Indexes: .
Foreign keys: [].

### messages_fts_trigram_idx

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| segid |  | 1 | None | 1 | 0 |
| term |  | 1 | None | 2 | 0 |
| pgno |  | 0 | None | 0 | 0 |

Indexes: sqlite_autoindex_messages_fts_trigram_idx_1 (unique).
Foreign keys: [].

### runtime_epoch

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| singleton | INTEGER | 0 | None | 1 | 0 |
| epoch | INTEGER | 1 | None | 0 | 0 |
| instance_id | TEXT | 1 | None | 0 | 0 |

Indexes: .
Foreign keys: [].

### schema_version

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| version | INTEGER | 1 | None | 0 | 0 |

Indexes: .
Foreign keys: [].

### session_admissions

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| seq | INTEGER | 0 | None | 1 | 0 |
| admission_id | TEXT | 1 | None | 0 | 0 |
| request_id | TEXT | 1 | None | 0 | 0 |
| principal_id | TEXT | 1 | None | 0 | 0 |
| target_session_id | TEXT | 1 | None | 0 | 0 |
| lineage_json | TEXT | 1 | None | 0 | 0 |
| payload_json | TEXT | 1 | None | 0 | 0 |
| payload_digest | TEXT | 1 | None | 0 | 0 |
| intent | TEXT | 1 | None | 0 | 0 |
| status | TEXT | 1 | None | 0 | 0 |
| outcome | TEXT | 0 | None | 0 | 0 |
| owner_epoch | INTEGER | 0 | None | 0 | 0 |
| generation | INTEGER | 0 | None | 0 | 0 |

Indexes: idx_session_admissions_cron_request, session_admissions_pending, sqlite_autoindex_session_admissions_2 (unique), sqlite_autoindex_session_admissions_1 (unique).
Foreign keys: [{"id": 0, "seq": 0, "table": "sessions", "from": "target_session_id", "to": "id", "on_update": "NO ACTION", "on_delete": "RESTRICT", "match": "NONE"}].

### session_model_usage

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| session_id | TEXT | 1 | None | 1 | 0 |
| model | TEXT | 1 | None | 2 | 0 |
| billing_provider | TEXT | 1 | '' | 3 | 0 |
| billing_base_url | TEXT | 1 | '' | 4 | 0 |
| billing_mode | TEXT | 1 | '' | 5 | 0 |
| task | TEXT | 1 | '' | 6 | 0 |
| api_call_count | INTEGER | 1 | 0 | 0 | 0 |
| input_tokens | INTEGER | 1 | 0 | 0 | 0 |
| output_tokens | INTEGER | 1 | 0 | 0 | 0 |
| cache_read_tokens | INTEGER | 1 | 0 | 0 | 0 |
| cache_write_tokens | INTEGER | 1 | 0 | 0 | 0 |
| reasoning_tokens | INTEGER | 1 | 0 | 0 | 0 |
| estimated_cost_usd | REAL | 1 | 0 | 0 | 0 |
| actual_cost_usd | REAL | 1 | 0 | 0 | 0 |
| cost_status | TEXT | 0 | None | 0 | 0 |
| cost_source | TEXT | 0 | None | 0 | 0 |
| first_seen | REAL | 0 | None | 0 | 0 |
| last_seen | REAL | 0 | None | 0 | 0 |

Indexes: idx_session_model_usage_model, idx_session_model_usage_session, sqlite_autoindex_session_model_usage_1 (unique).
Foreign keys: [{"id": 0, "seq": 0, "table": "sessions", "from": "session_id", "to": "id", "on_update": "NO ACTION", "on_delete": "CASCADE", "match": "NONE"}].

### session_turn_leases

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| conversation_id | TEXT | 0 | None | 1 | 0 |
| holder | TEXT | 1 | None | 0 | 0 |
| acquired_at | REAL | 1 | None | 0 | 0 |
| expires_at | REAL | 1 | None | 0 | 0 |

Indexes: idx_session_turn_leases_expires, sqlite_autoindex_session_turn_leases_1 (unique).
Foreign keys: [].

### sessions

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| id | TEXT | 0 | None | 1 | 0 |
| source | TEXT | 1 | None | 0 | 0 |
| created_source | TEXT | 0 | None | 0 | 0 |
| user_id | TEXT | 0 | None | 0 | 0 |
| session_key | TEXT | 0 | None | 0 | 0 |
| chat_id | TEXT | 0 | None | 0 | 0 |
| chat_type | TEXT | 0 | None | 0 | 0 |
| thread_id | TEXT | 0 | None | 0 | 0 |
| display_name | TEXT | 0 | None | 0 | 0 |
| origin_json | TEXT | 0 | None | 0 | 0 |
| expiry_finalized | INTEGER | 0 | 0 | 0 | 0 |
| model | TEXT | 0 | None | 0 | 0 |
| model_config | TEXT | 0 | None | 0 | 0 |
| system_prompt | TEXT | 0 | None | 0 | 0 |
| system_prompt_hash | TEXT | 0 | None | 0 | 0 |
| parent_session_id | TEXT | 0 | None | 0 | 0 |
| started_at | REAL | 1 | None | 0 | 0 |
| ended_at | REAL | 0 | None | 0 | 0 |
| end_reason | TEXT | 0 | None | 0 | 0 |
| message_count | INTEGER | 0 | 0 | 0 | 0 |
| tool_call_count | INTEGER | 0 | 0 | 0 | 0 |
| input_tokens | INTEGER | 0 | 0 | 0 | 0 |
| output_tokens | INTEGER | 0 | 0 | 0 | 0 |
| cache_read_tokens | INTEGER | 0 | 0 | 0 | 0 |
| cache_write_tokens | INTEGER | 0 | 0 | 0 | 0 |
| reasoning_tokens | INTEGER | 0 | 0 | 0 | 0 |
| cwd | TEXT | 0 | None | 0 | 0 |
| git_branch | TEXT | 0 | None | 0 | 0 |
| git_repo_root | TEXT | 0 | None | 0 | 0 |
| git_metadata_generation | INTEGER | 1 | 0 | 0 | 0 |
| billing_provider | TEXT | 0 | None | 0 | 0 |
| billing_base_url | TEXT | 0 | None | 0 | 0 |
| billing_mode | TEXT | 0 | None | 0 | 0 |
| estimated_cost_usd | REAL | 0 | None | 0 | 0 |
| actual_cost_usd | REAL | 0 | None | 0 | 0 |
| cost_status | TEXT | 0 | None | 0 | 0 |
| cost_source | TEXT | 0 | None | 0 | 0 |
| pricing_version | TEXT | 0 | None | 0 | 0 |
| title | TEXT | 0 | None | 0 | 0 |
| title_source | TEXT | 0 | None | 0 | 0 |
| last_activity_at | REAL | 0 | None | 0 | 0 |
| last_activity_description | TEXT | 0 | None | 0 | 0 |
| last_activity_provenance | TEXT | 0 | None | 0 | 0 |
| api_call_count | INTEGER | 0 | 0 | 0 | 0 |
| handoff_state | TEXT | 0 | None | 0 | 0 |
| handoff_platform | TEXT | 0 | None | 0 | 0 |
| handoff_error | TEXT | 0 | None | 0 | 0 |
| compression_failure_cooldown_until | REAL | 0 | None | 0 | 0 |
| compression_failure_error | TEXT | 0 | None | 0 | 0 |
| compression_fallback_streak | INTEGER | 1 | 0 | 0 | 0 |
| compression_ineffective_count | INTEGER | 1 | 0 | 0 | 0 |
| compression_recovery_deadline | REAL | 0 | None | 0 | 0 |
| compression_overload_streak | INTEGER | 1 | 0 | 0 | 0 |
| profile_name | TEXT | 0 | None | 0 | 0 |
| transport_profile | TEXT | 0 | None | 0 | 0 |
| rewind_count | INTEGER | 1 | 0 | 0 | 0 |
| archived | INTEGER | 1 | 0 | 0 | 0 |
| auto_archived | INTEGER | 1 | 0 | 0 | 0 |
| pinned | INTEGER | 1 | 0 | 0 | 0 |
| hidden | INTEGER | 1 | 0 | 0 | 0 |
| last_read_at | REAL | 0 | None | 0 | 0 |
| tool_names | TEXT | 0 | None | 0 | 0 |
| runtime_revision | INTEGER | 1 | 0 | 0 | 0 |
| runtime_generation | INTEGER | 1 | 0 | 0 | 0 |
| transcript_revision | INTEGER | 1 | 0 | 0 | 0 |

Indexes: idx_sessions_local_created_started, idx_sessions_title_unique (unique), idx_sessions_effective_activity, idx_sessions_tool_names, idx_sessions_system_prompt_hash, idx_sessions_handoff_state, idx_sessions_gateway_peer, idx_sessions_session_key, idx_sessions_started, idx_sessions_parent, idx_sessions_source_id, idx_sessions_source, sqlite_autoindex_sessions_1 (unique).
Foreign keys: [{"id": 0, "seq": 0, "table": "system_prompts", "from": "system_prompt_hash", "to": "hash", "on_update": "NO ACTION", "on_delete": "NO ACTION", "match": "NONE"}, {"id": 1, "seq": 0, "table": "sessions", "from": "parent_session_id", "to": "id", "on_update": "NO ACTION", "on_delete": "NO ACTION", "match": "NONE"}].

### sqlite_sequence

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| name |  | 0 | None | 0 | 0 |
| seq |  | 0 | None | 0 | 0 |

Indexes: .
Foreign keys: [].

### state_meta

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| key | TEXT | 0 | None | 1 | 0 |
| value | TEXT | 0 | None | 0 | 0 |

Indexes: sqlite_autoindex_state_meta_1 (unique).
Foreign keys: [].

### system_prompts

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| hash | TEXT | 0 | None | 1 | 0 |
| prompt | TEXT | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_system_prompts_1 (unique).
Foreign keys: [].

### worker_executions

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| execution_id | TEXT | 0 | None | 1 | 0 |
| session_id | TEXT | 1 | None | 0 | 0 |
| kind | TEXT | 1 | None | 0 | 0 |
| owner_epoch | INTEGER | 1 | None | 0 | 0 |
| generation | INTEGER | 1 | None | 0 | 0 |
| status | TEXT | 1 | None | 0 | 0 |
| adoption_digest | TEXT | 1 | None | 0 | 0 |
| last_sequence | INTEGER | 1 | 0 | 0 | 0 |

Indexes: idx_worker_executions_session_status, sqlite_autoindex_worker_executions_1 (unique).
Foreign keys: [{"id": 0, "seq": 0, "table": "sessions", "from": "session_id", "to": "id", "on_update": "NO ACTION", "on_delete": "RESTRICT", "match": "NONE"}].

### worker_receipts

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| execution_id | TEXT | 1 | None | 1 | 0 |
| sequence | INTEGER | 1 | None | 2 | 0 |
| payload_digest | TEXT | 1 | None | 0 | 0 |
| result_json | TEXT | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_worker_receipts_1 (unique).
Foreign keys: [{"id": 0, "seq": 0, "table": "worker_executions", "from": "execution_id", "to": "execution_id", "on_update": "NO ACTION", "on_delete": "RESTRICT", "match": "NONE"}].

## C:\Users\bharg\AppData\Local\hermes\projects.db

SQLite user_version: 0; schema_version: 5; journal: wal.

### discovered_repos

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| root | TEXT | 0 | None | 1 | 0 |
| label | TEXT | 0 | None | 0 | 0 |
| last_seen | INTEGER | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_discovered_repos_1 (unique).
Foreign keys: [].

### project_folders

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| project_id | TEXT | 1 | None | 1 | 0 |
| path | TEXT | 1 | None | 2 | 0 |
| label | TEXT | 0 | None | 0 | 0 |
| is_primary | INTEGER | 1 | 0 | 0 | 0 |
| added_at | INTEGER | 1 | None | 0 | 0 |

Indexes: idx_project_folders_path, sqlite_autoindex_project_folders_1 (unique).
Foreign keys: [{"id": 0, "seq": 0, "table": "projects", "from": "project_id", "to": "id", "on_update": "NO ACTION", "on_delete": "CASCADE", "match": "NONE"}].

### project_meta

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| key | TEXT | 0 | None | 1 | 0 |
| value | TEXT | 0 | None | 0 | 0 |

Indexes: sqlite_autoindex_project_meta_1 (unique).
Foreign keys: [].

### projects

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| id | TEXT | 0 | None | 1 | 0 |
| slug | TEXT | 1 | None | 0 | 0 |
| name | TEXT | 1 | None | 0 | 0 |
| description | TEXT | 0 | None | 0 | 0 |
| icon | TEXT | 0 | None | 0 | 0 |
| color | TEXT | 0 | None | 0 | 0 |
| board_slug | TEXT | 0 | None | 0 | 0 |
| primary_path | TEXT | 0 | None | 0 | 0 |
| created_at | INTEGER | 1 | None | 0 | 0 |
| archived | INTEGER | 1 | 0 | 0 | 0 |

Indexes: sqlite_autoindex_projects_2 (unique), sqlite_autoindex_projects_1 (unique).
Foreign keys: [].

## C:\Users\bharg\AppData\Local\hermes\shared-state.db

SQLite user_version: 0; schema_version: 19; journal: wal.

### hosted_room_events

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 1 | None | 1 | 0 |
| seq | INTEGER | 1 | None | 2 | 0 |
| event_id | TEXT | 1 | None | 0 | 0 |
| kind | TEXT | 1 | None | 0 | 0 |
| actor_json | TEXT | 1 | None | 0 | 0 |
| authority_epoch | INTEGER | 0 | None | 0 | 0 |
| payload_json | TEXT | 1 | None | 0 | 0 |
| created_at | REAL | 1 | None | 0 | 0 |

Indexes: idx_hosted_room_user_thread, idx_hosted_room_events_cursor, sqlite_autoindex_hosted_room_events_2 (unique), sqlite_autoindex_hosted_room_events_1 (unique).
Foreign keys: [{"id": 0, "seq": 0, "table": "hosted_rooms", "from": "room_id", "to": "room_id", "on_update": "NO ACTION", "on_delete": "NO ACTION", "match": "NONE"}].

### hosted_room_legacy_imports

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| source | TEXT | 0 | None | 1 | 0 |
| imported_at | REAL | 1 | None | 0 | 0 |
| rooms | INTEGER | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_legacy_imports_1 (unique).
Foreign keys: [].

### hosted_room_links

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 1 | None | 1 | 0 |
| member_id | TEXT | 1 | None | 2 | 0 |
| target_url | TEXT | 1 | None | 0 | 0 |
| target_profile | TEXT | 1 | None | 0 | 0 |
| grant | TEXT | 1 | None | 0 | 0 |
| catalog_json | TEXT | 1 | None | 0 | 0 |
| cancellation_scope_id | TEXT | 1 | None | 0 | 0 |
| trace_id | TEXT | 1 | None | 0 | 0 |
| transport_security | TEXT | 1 | None | 0 | 0 |
| status | TEXT | 1 | 'ready' | 0 | 0 |
| updated_at | REAL | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_links_1 (unique).
Foreign keys: [].

### hosted_room_peer_reservations

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 1 | None | 1 | 0 |
| member_id | TEXT | 1 | None | 2 | 0 |
| target_profile | TEXT | 1 | None | 3 | 0 |
| authority_gateway_id | TEXT | 1 | None | 0 | 0 |
| authority_epoch | INTEGER | 1 | None | 0 | 0 |
| expires_at | REAL | 1 | None | 0 | 0 |
| revoked_at | REAL | 0 | None | 0 | 0 |
| created_at | REAL | 1 | None | 0 | 0 |
| updated_at | REAL | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_peer_reservations_1 (unique).
Foreign keys: [].

### hosted_room_policy_cursors

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 0 | None | 1 | 0 |
| through_seq | INTEGER | 1 | 0 | 0 | 0 |
| stopped_through_seq | INTEGER | 1 | 0 | 0 | 0 |
| updated_at | REAL | 1 | 0 | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_policy_cursors_1 (unique).
Foreign keys: [].

### hosted_room_policy_events

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 1 | None | 1 | 0 |
| thread_id | TEXT | 1 | None | 0 | 0 |
| discussion_event_id | TEXT | 1 | None | 0 | 0 |
| seq | INTEGER | 1 | None | 2 | 0 |
| event_json | TEXT | 1 | None | 0 | 0 |

Indexes: idx_hosted_room_policy_events_active, sqlite_autoindex_hosted_room_policy_events_1 (unique).
Foreign keys: [].

### hosted_room_policy_publications

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 1 | None | 1 | 0 |
| task_id | TEXT | 1 | None | 2 | 0 |
| kind | TEXT | 1 | None | 3 | 0 |
| execution_generation | INTEGER | 1 | 0 | 4 | 0 |
| seq | INTEGER | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_policy_publications_1 (unique).
Foreign keys: [].

### hosted_room_policy_threads

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 1 | None | 1 | 0 |
| thread_id | TEXT | 1 | None | 2 | 0 |
| discussion_event_id | TEXT | 1 | None | 0 | 0 |
| latest_user_seq | INTEGER | 1 | None | 0 | 0 |
| completed | INTEGER | 1 | 0 | 0 | 0 |

Indexes: idx_hosted_room_policy_pending, sqlite_autoindex_hosted_room_policy_threads_1 (unique).
Foreign keys: [].

### hosted_room_policy_transcript

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 1 | None | 1 | 0 |
| thread_id | TEXT | 1 | None | 2 | 0 |
| seq | INTEGER | 1 | None | 3 | 0 |
| kind | TEXT | 1 | None | 0 | 0 |
| settled_seq | INTEGER | 0 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_policy_transcript_1 (unique).
Foreign keys: [].

### hosted_room_policy_transcript_state

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 0 | None | 1 | 0 |
| schema_version | INTEGER | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_policy_transcript_state_1 (unique).
Foreign keys: [].

### hosted_room_policy_watermarks

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 1 | None | 1 | 0 |
| thread_id | TEXT | 1 | None | 2 | 0 |
| member_id | TEXT | 1 | None | 3 | 0 |
| seen_through_seq | INTEGER | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_policy_watermarks_1 (unique).
Foreign keys: [].

### hosted_room_remote_runs

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 1 | None | 1 | 0 |
| home_install_id | TEXT | 1 | None | 2 | 0 |
| authority_gateway_id | TEXT | 1 | None | 3 | 0 |
| authority_epoch | INTEGER | 1 | None | 4 | 0 |
| member_id | TEXT | 1 | None | 5 | 0 |
| task_id | TEXT | 1 | None | 8 | 0 |
| execution_generation | INTEGER | 1 | None | 9 | 0 |
| target_install_id | TEXT | 1 | None | 6 | 0 |
| target_profile | TEXT | 1 | None | 7 | 0 |
| run_id | TEXT | 1 | None | 0 | 0 |
| session_id | TEXT | 1 | None | 0 | 0 |
| created_at | REAL | 1 | None | 0 | 0 |
| updated_at | REAL | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_remote_runs_1 (unique).
Foreign keys: [].

### hosted_room_retired_ids

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 0 | None | 1 | 0 |
| retired_at | REAL | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_retired_ids_1 (unique).
Foreign keys: [].

### hosted_room_revoked_grants

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| scope_key | TEXT | 0 | None | 1 | 0 |
| expires_at | REAL | 1 | None | 0 | 0 |
| revoked_before | REAL | 1 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_room_revoked_grants_1 (unique).
Foreign keys: [].

### hosted_rooms

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| room_id | TEXT | 0 | None | 1 | 0 |
| name | TEXT | 1 | None | 0 | 0 |
| members_json | TEXT | 1 | None | 0 | 0 |
| authority_gateway_id | TEXT | 1 | None | 0 | 0 |
| authority_epoch | INTEGER | 1 | 1 | 0 | 0 |
| next_seq | INTEGER | 1 | 1 | 0 | 0 |
| event_bytes | INTEGER | 1 | 0 | 0 | 0 |
| revision | INTEGER | 1 | 1 | 0 | 0 |
| created_at | REAL | 1 | None | 0 | 0 |
| updated_at | REAL | 1 | None | 0 | 0 |
| disbanded_at | REAL | 0 | None | 0 | 0 |

Indexes: sqlite_autoindex_hosted_rooms_1 (unique).
Foreign keys: [].

## C:\Users\bharg\AppData\Local\hermes\cron\executions.db

SQLite user_version: 0; schema_version: 7; journal: wal.

### executions

| Column | SQLite type | Not null | Default | PK | Hidden |
|---|---|---|---|---|---|
| id | TEXT | 0 | None | 1 | 0 |
| job_id | TEXT | 1 | None | 0 | 0 |
| source | TEXT | 1 | None | 0 | 0 |
| process_id | TEXT | 1 | None | 0 | 0 |
| pid | INTEGER | 1 | None | 0 | 0 |
| process_started_at | INTEGER | 0 | None | 0 | 0 |
| status | TEXT | 1 | None | 0 | 0 |
| handoff_pending | INTEGER | 1 | 0 | 0 | 0 |
| handoff_started_at | REAL | 0 | None | 0 | 0 |
| claimed_at | TEXT | 1 | None | 0 | 0 |
| started_at | TEXT | 0 | None | 0 | 0 |
| finished_at | TEXT | 0 | None | 0 | 0 |
| error | TEXT | 0 | None | 0 | 0 |
| delivery_outcome | TEXT | 0 | None | 0 | 0 |
| scheduled_instant | TEXT | 0 | None | 0 | 0 |
| progress_at | TEXT | 0 | None | 0 | 0 |

Indexes: idx_executions_occurrence, idx_executions_status_claimed, idx_executions_job_claimed, sqlite_autoindex_executions_1 (unique).
Foreign keys: [].
