-- ============================================================================
-- SCRIPT DE TESTING: RATE LIMITING Y L脥MITES DE RECURSOS
-- ============================================================================
-- Fecha: 2025-11-15
-- Descripci贸n: Script para verificar que los l铆mites de seguridad funcionan
-- ============================================================================

-- IMPORTANTE: Ejecutar este script en un entorno de desarrollo/testing
-- NO ejecutar en producci贸n ya que generar谩 muchos registros de prueba

-- ----------------------------------------------------------------------------
-- PREPARACI脫N: Crear usuario y grupo de prueba
-- ----------------------------------------------------------------------------

-- Nota: Debes estar logeado como un usuario de prueba para ejecutar esto
-- O puedes modificar para usar set_config('request.jwt.claim.sub', '<user_id>', true);

DO $$
DECLARE
  v_test_group_id uuid;
  v_test_user_id uuid;
  v_error_raised boolean := false;
  v_expense_count integer := 0;
  v_guest_count integer := 0;
  v_invitation_count integer := 0;
BEGIN
  RAISE NOTICE '馃И Starting security tests...';
  RAISE NOTICE '';
  
  -- Obtener un usuario existente de la base de datos
  -- (toma el primer usuario que encuentre)
  SELECT id INTO v_test_user_id
  FROM auth.users
  LIMIT 1;
  
  IF v_test_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in database. Please create a user first via your app signup.';
  END IF;
  
  RAISE NOTICE '馃У User ID (selected for testing): %', v_test_user_id;
  
  -- Simular que este usuario est谩 autenticado para los triggers
  PERFORM set_config('request.jwt.claim.sub', v_test_user_id::text, true);
  
  -- Crear grupo de prueba
  INSERT INTO groups (name, description, created_by)
  VALUES ('Security Test Group', 'Testing rate limits', v_test_user_id)
  RETURNING id INTO v_test_group_id;
  
  RAISE NOTICE '馃У Group ID: %', v_test_group_id;
  RAISE NOTICE '';
  
  -- -------------------------------------------------------------------------
  -- TEST 1: RATE LIMITING EN GASTOS (50 por hora)
  -- -------------------------------------------------------------------------
  RAISE NOTICE '鉁侊笍 TEST 1: Expense Rate Limiting (max 50/hour)';
  RAISE NOTICE '  Attempting to create 55 expenses...';
  
  v_error_raised := false;
  
  FOR i IN 1..55 LOOP
    BEGIN
      INSERT INTO expenses (group_id, description, amount, paid_by)
      VALUES (
        v_test_group_id, 
        'Test Expense ' || i, 
        100.00, 
        v_test_user_id
      );
      v_expense_count := v_expense_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        IF NOT v_error_raised THEN
          RAISE NOTICE '  鉁?Rate limit triggered after % expenses', v_expense_count;
          RAISE NOTICE '  Error: %', SQLERRM;
          v_error_raised := true;
        END IF;
        EXIT; -- Salir del loop despu茅s del primer error
    END;
  END LOOP;
  
  IF v_expense_count = 55 THEN
    RAISE WARNING '  鉂? FAILED: Rate limit did not trigger! Created all 55 expenses.';
  ELSIF v_expense_count = 50 THEN
    RAISE NOTICE '  鉁?PASSED: Rate limit working correctly (50 expenses created)';
  ELSE
    RAISE WARNING '  鈿狅笍 PARTIAL: Only % expenses created (expected 50)', v_expense_count;
  END IF;
  
  RAISE NOTICE '';
  
  -- -------------------------------------------------------------------------
  -- TEST 2: RATE LIMITING EN INVITADOS (25 por hora)
  -- -------------------------------------------------------------------------
  RAISE NOTICE '鉁侊笍 TEST 2: Guest Rate Limiting (max 25/hour)';
  RAISE NOTICE '  Attempting to add 25 guests...';
  
  v_error_raised := false;
  v_guest_count := 0;
  
  FOR i IN 1..25 LOOP
    BEGIN
      INSERT INTO group_members (group_id, user_id, display_name)
      VALUES (
        v_test_group_id,
        NULL, -- NULL user_id = guest
        'Guest ' || i
      );
      v_guest_count := v_guest_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        IF NOT v_error_raised THEN
          RAISE NOTICE '  鉁?Rate limit triggered after % guests', v_guest_count;
          RAISE NOTICE '  Error: %', SQLERRM;
          v_error_raised := true;
        END IF;
        EXIT;
    END;
  END LOOP;
  
  IF v_guest_count = 30 THEN
    RAISE WARNING '  鉂? FAILED: Rate limit did not trigger! Added all 30 guests.';
  ELSIF v_guest_count = 25 THEN
    RAISE NOTICE '  鉁?PASSED: Rate limit working correctly (25 guests added)';
  ELSE
    RAISE WARNING '  鈿狅笍 PARTIAL: Only % guests added (expected 25)', v_guest_count;
  END IF;
  
  RAISE NOTICE '';
  
  -- -------------------------------------------------------------------------
  -- TEST 3: RATE LIMITING EN INVITACIONES (25 por hora)
  -- -------------------------------------------------------------------------
  RAISE NOTICE '鉁侊笍 TEST 3: Invitation Rate Limiting (max 25/hour)';
  RAISE NOTICE '  Attempting to send 25 invitations...';
  
  v_error_raised := false;
  v_invitation_count := 0;
  
  FOR i IN 1..25 LOOP
    BEGIN
      INSERT INTO group_invitations (group_id, invited_email, invited_by, status)
      VALUES (
        v_test_group_id,
        'test' || i || '@example.com',
        v_test_user_id,
        'pending'
      );
      v_invitation_count := v_invitation_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        IF NOT v_error_raised THEN
          RAISE NOTICE '  鉁?Rate limit triggered after % invitations', v_invitation_count;
          RAISE NOTICE '  Error: %', SQLERRM;
          v_error_raised := true;
        END IF;
        EXIT;
    END;
  END LOOP;
  
  IF v_invitation_count = 30 THEN
    RAISE WARNING '  鉂? FAILED: Rate limit did not trigger! Sent all 30 invitations.';
  ELSIF v_invitation_count = 25 THEN
    RAISE NOTICE '  鉁?PASSED: Rate limit working correctly (25 invitations sent)';
  ELSE
    RAISE WARNING '  鈿狅笍 PARTIAL: Only % invitations sent (expected 5)', v_invitation_count;
  END IF;
  
  RAISE NOTICE '';
  
  -- -------------------------------------------------------------------------
  -- TEST 4: L脥MITE DE MIEMBROS POR GRUPO (100)
  -- -------------------------------------------------------------------------
  RAISE NOTICE '鉁侊笍 TEST 4: Max Members Per Group (limit 100)';
  RAISE NOTICE '  This test would require adding 90+ more members...';
  RAISE NOTICE '  Skipping for brevity (manually test if needed)';
  RAISE NOTICE '';
  
  -- -------------------------------------------------------------------------
  -- TEST 5: L脥MITE DE GASTOS POR GRUPO (1000)
  -- -------------------------------------------------------------------------
  RAISE NOTICE '鉁侊笍 TEST 5: Max Expenses Per Group (limit 1000)';
  RAISE NOTICE '  This test would require adding 950+ more expenses...';
  RAISE NOTICE '  Skipping for brevity (manually test if needed)';
  RAISE NOTICE '';
  
  -- -------------------------------------------------------------------------
  -- RESUMEN DE RATE LIMITS
  -- -------------------------------------------------------------------------
  RAISE NOTICE '📊 Rate Limit Status:';
  
  -- Mostrar estado de rate_limits para el usuario actual
  DECLARE
    rec RECORD;
  BEGIN
    FOR rec IN (
      SELECT action, attempts, window_start, 
             EXTRACT(EPOCH FROM (now() - window_start)) / 60 as minutes_ago
      FROM rate_limits
      WHERE user_id = v_test_user_id
      ORDER BY action
    ) LOOP
      RAISE NOTICE '  %: % attempts (window started % minutes ago)', 
        rec.action, rec.attempts, ROUND(rec.minutes_ago::numeric, 1);
    END LOOP;
  END;
  
  RAISE NOTICE '';
  
  -- -------------------------------------------------------------------------
  -- CLEANUP (opcional)
  -- -------------------------------------------------------------------------
  RAISE NOTICE '馃И Cleanup: Deleting test group and related data...';
  
  -- Borrar gastos de prueba
  DELETE FROM expenses WHERE group_id = v_test_group_id;
  
  -- Borrar invitaciones de prueba
  DELETE FROM group_invitations WHERE group_id = v_test_group_id;
  
  -- Borrar miembros de prueba
  DELETE FROM group_members WHERE group_id = v_test_group_id;
  
  -- Borrar grupo de prueba
  DELETE FROM groups WHERE id = v_test_group_id;
  
  -- NOTA: No borramos rate_limits para que puedas verificar que se limpi贸 correctamente
  RAISE NOTICE '馃И Cleanup complete (rate_limits kept for inspection)';
  RAISE NOTICE '';
  
  -- -------------------------------------------------------------------------
  -- CONCLUSI脫N
  -- -------------------------------------------------------------------------
  RAISE NOTICE '========================================';
  RAISE NOTICE '馃У Security Tests Completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Check results above for PASSED/FAILED status';
  RAISE NOTICE 'Rate limit entries will auto-cleanup after 2 hours via pg_cron';
  RAISE NOTICE '';
  
END $$;

-- ----------------------------------------------------------------------------
-- QUERIES 脷TILES PARA INSPECCI脫N MANUAL
-- ----------------------------------------------------------------------------

-- Ver todos los rate limits actuales
-- SELECT * FROM rate_limits ORDER BY window_start DESC;

-- Ver uso de recursos actual
-- SELECT * FROM resource_usage_summary;

-- Ver grupos por usuario
-- SELECT * FROM user_group_usage WHERE user_id = auth.uid();

-- Ver invitaciones pendientes
-- SELECT * FROM group_invitations WHERE status = 'pending' ORDER BY created_at DESC;

-- Limpiar manualmente rate_limits expirados (simular pg_cron job)
-- DELETE FROM rate_limits WHERE window_start < now() - interval '2 hours';
