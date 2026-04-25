# Supabase RLS Policies - public schema

Este documento contiene un volcado de las políticas de Seguridad de Nivel de Fila (RLS) configuradas actualmente en el proyecto de Supabase.

## Resumen por Tabla

### Table: `profiles`
| Policy Name | Action | Roles | Using (Qual) | With Check |
|-------------|--------|-------|--------------|------------|
| `profiles_select_shared` | SELECT | authenticated | `((id = auth.uid()) OR share_group(id, auth.uid()) OR (is_guest = true))` | - |
| `profiles_insert_self` | INSERT | authenticated | - | `(id = auth.uid())` |
| `profiles_update_self` | UPDATE | authenticated | `(id = auth.uid())` | `(id = auth.uid())` |
| `profiles_select_self` | SELECT | authenticated | `(id = auth.uid())` | - |

### Table: `group_members`
| Policy Name | Action | Roles | Using (Qual) | With Check |
|-------------|--------|-------|--------------|------------|
| `gm_insert` | INSERT | authenticated | - | `((user_id = auth.uid()) OR user_is_member_of_group(group_id, auth.uid()))` |
| `gm_select` | SELECT | authenticated | `user_is_member_of_group(group_id, auth.uid())` | - |
| `gm_delete` | DELETE | authenticated | `((user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM groups g2 WHERE ((g2.id = group_members.group_id) AND (g2.created_by = auth.uid())))))` | - |

### Table: `groups`
| Policy Name | Action | Roles | Using (Qual) | With Check |
|-------------|--------|-------|--------------|------------|
| `Groups: update own` | UPDATE | authenticated | `(( SELECT auth.uid() AS uid) = created_by)` | `(( SELECT auth.uid() AS uid) = created_by)` |
| `groups_select_policy` | SELECT | authenticated | `user_is_member_of_group(id, auth.uid())` | - |
| `groups_update_policy` | UPDATE | authenticated | `(created_by = auth.uid())` | `(created_by = auth.uid())` |
| `groups_delete_policy` | DELETE | authenticated | `(created_by = auth.uid())` | - |
| `Enable insert for authenticated users only` | INSERT | authenticated | - | `true` |
| `Groups: select own` | SELECT | authenticated | `(( SELECT auth.uid() AS uid) = created_by)` | - |
| `Groups: insert own` | INSERT | authenticated | - | `(( SELECT auth.uid() AS uid) = created_by)` |
| `Groups: delete own` | DELETE | authenticated | `(( SELECT auth.uid() AS uid) = created_by)` | - |

### Table: `expenses`
| Policy Name | Action | Roles | Using (Qual) | With Check |
|-------------|--------|-------|--------------|------------|
| `expenses_delete` | DELETE | authenticated | `user_is_member_of_group(group_id, auth.uid())` | - |
| `expenses_select` | SELECT | authenticated | `user_is_member_of_group(group_id, auth.uid())` | - |
| `expenses_insert` | INSERT | authenticated | - | `user_is_member_of_group(group_id, auth.uid())` |
| `expenses_update` | UPDATE | authenticated | `user_is_member_of_group(group_id, auth.uid())` | `user_is_member_of_group(group_id, auth.uid())` |

### Table: `expense_splits`
| Policy Name | Action | Roles | Using (Qual) | With Check |
|-------------|--------|-------|--------------|------------|
| `splits_mutate` | ALL | authenticated | `(EXISTS ( SELECT 1 FROM expenses e2 WHERE ((e2.id = expense_splits.expense_id) AND user_is_member_of_group(e2.group_id, auth.uid()))))` | `(EXISTS ( SELECT 1 FROM expenses e2 WHERE ((e2.id = expense_splits.expense_id) AND user_is_member_of_group(e2.group_id, auth.uid()))))` |
| `splits_select` | SELECT | authenticated | `(EXISTS ( SELECT 1 FROM expenses e2 WHERE ((e2.id = expense_splits.expense_id) AND user_is_member_of_group(e2.group_id, auth.uid()))))` | - |

### Table: `settlements`
| Policy Name | Action | Roles | Using (Qual) | With Check |
|-------------|--------|-------|--------------|------------|
| `settlements_delete` | DELETE | authenticated | `user_is_member_of_group(group_id, auth.uid())` | - |
| `settlements_select` | SELECT | authenticated | `user_is_member_of_group(group_id, auth.uid())` | - |
| `settlements_insert` | INSERT | authenticated | - | `user_is_member_of_group(group_id, auth.uid())` |
| `settlements_update` | UPDATE | authenticated | `user_is_member_of_group(group_id, auth.uid())` | `user_is_member_of_group(group_id, auth.uid())` |

### Table: `group_invitations`
| Policy Name | Action | Roles | Using (Qual) | With Check |
|-------------|--------|-------|--------------|------------|
| `Crear invitaciones como miembro` | INSERT | public | - | `(EXISTS ( SELECT 1 FROM group_members gm WHERE ((gm.group_id = group_invitations.group_id) AND (gm.user_id = auth.uid()))))` |
| `Actualizar mis invitaciones` | UPDATE | public | `(invited_email = ( SELECT email FROM profiles WHERE (id = auth.uid())))` | - |
| `Users can view invitations sent to them` | SELECT | public | `(invited_email = ( SELECT email FROM profiles WHERE (id = auth.uid())))` | - |
| `Users can accept invitations sent to them` | UPDATE | public | `((invited_email = ( SELECT email FROM profiles WHERE (id = auth.uid()))) AND (status = 'pending'::text))` | `(status = 'accepted'::text)` |
| `Users can view invitations they sent` | SELECT | public | `(auth.uid() = invited_by)` | - |
| `Ver invitaciones del grupo o propias` | SELECT | public | `((EXISTS ( SELECT 1 FROM group_members gm WHERE ((gm.group_id = group_invitations.group_id) AND (gm.user_id = auth.uid())))) OR (invited_email = ( SELECT email FROM profiles WHERE (id = auth.uid()))))` | - |

---
*Generado automáticamente mediante Supabase MCP el 2026-04-25*
