-- =============================================================
-- Migration: 00002_rls_policies.sql
-- Description: Comprehensive Row Level Security (RLS) policies
--              enforcing least-privilege access for all 29 tables.
-- =============================================================

-- -------------------------------------------------------------
-- 1. HELPER FUNCTIONS FOR SECURITY CONTEXT
-- -------------------------------------------------------------

-- Get user role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS boolean AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get customer id associated with user profile
CREATE OR REPLACE FUNCTION public.get_customer_id(u_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.customers WHERE profile_id = u_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get mechanic id associated with user profile
CREATE OR REPLACE FUNCTION public.get_mechanic_id(u_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.mechanics WHERE profile_id = u_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -------------------------------------------------------------
-- 2. PROFILES POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      OR public.is_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 3. CUSTOMERS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read own record" ON public.customers;
CREATE POLICY "Customers can read own record"
  ON public.customers FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Customers can insert own record" ON public.customers;
CREATE POLICY "Customers can insert own record"
  ON public.customers FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own record" ON public.customers;
CREATE POLICY "Customers can update own record"
  ON public.customers FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all customers" ON public.customers;
CREATE POLICY "Admins can manage all customers"
  ON public.customers FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 4. TRACTORS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read own tractors" ON public.tractors;
CREATE POLICY "Customers can read own tractors"
  ON public.tractors FOR SELECT
  USING (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Mechanics can read tractors for assigned jobs" ON public.tractors;
CREATE POLICY "Mechanics can read tractors for assigned jobs"
  ON public.tractors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.repair_requests r ON j.request_id = r.id
      WHERE r.tractor_id = tractors.id
        AND j.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can insert own tractors" ON public.tractors;
CREATE POLICY "Customers can insert own tractors"
  ON public.tractors FOR INSERT
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Customers can update own tractors" ON public.tractors;
CREATE POLICY "Customers can update own tractors"
  ON public.tractors FOR UPDATE
  USING (customer_id = public.get_customer_id(auth.uid()))
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Customers can delete own tractors" ON public.tractors;
CREATE POLICY "Customers can delete own tractors"
  ON public.tractors FOR DELETE
  USING (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all tractors" ON public.tractors;
CREATE POLICY "Admins can manage all tractors"
  ON public.tractors FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 5. MECHANICS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Mechanics can read own record" ON public.mechanics;
CREATE POLICY "Mechanics can read own record"
  ON public.mechanics FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Customers and public can read approved mechanics" ON public.mechanics;
CREATE POLICY "Customers and public can read approved mechanics"
  ON public.mechanics FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "Mechanics can insert own record" ON public.mechanics;
CREATE POLICY "Mechanics can insert own record"
  ON public.mechanics FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Mechanics can update own record excluding status" ON public.mechanics;
CREATE POLICY "Mechanics can update own record excluding status"
  ON public.mechanics FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (
    profile_id = auth.uid()
    AND status = (SELECT m.status FROM public.mechanics m WHERE m.id = mechanics.id)
  );

DROP POLICY IF EXISTS "Admins can manage all mechanics" ON public.mechanics;
CREATE POLICY "Admins can manage all mechanics"
  ON public.mechanics FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 6. PROBLEM CATEGORIES POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read active categories" ON public.problem_categories;
CREATE POLICY "Anyone can read active categories"
  ON public.problem_categories FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.problem_categories;
CREATE POLICY "Admins can manage categories"
  ON public.problem_categories FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 7. MECHANIC SKILLS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read mechanic skills" ON public.mechanic_skills;
CREATE POLICY "Anyone can read mechanic skills"
  ON public.mechanic_skills FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Mechanics can manage own skills" ON public.mechanic_skills;
CREATE POLICY "Mechanics can manage own skills"
  ON public.mechanic_skills FOR ALL
  USING (mechanic_id = public.get_mechanic_id(auth.uid()))
  WITH CHECK (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all mechanic skills" ON public.mechanic_skills;
CREATE POLICY "Admins can manage all mechanic skills"
  ON public.mechanic_skills FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 8. MECHANIC DOCUMENTS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Mechanic can read own documents" ON public.mechanic_documents;
CREATE POLICY "Mechanic can read own documents"
  ON public.mechanic_documents FOR SELECT
  USING (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all documents" ON public.mechanic_documents;
CREATE POLICY "Admins can read all documents"
  ON public.mechanic_documents FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Mechanic can insert own documents" ON public.mechanic_documents;
CREATE POLICY "Mechanic can insert own documents"
  ON public.mechanic_documents FOR INSERT
  WITH CHECK (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can update documents" ON public.mechanic_documents;
CREATE POLICY "Admins can update documents"
  ON public.mechanic_documents FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Mechanic can delete own pending documents" ON public.mechanic_documents;
CREATE POLICY "Mechanic can delete own pending documents"
  ON public.mechanic_documents FOR DELETE
  USING (
    mechanic_id = public.get_mechanic_id(auth.uid())
    AND status = 'pending'
  );

-- -------------------------------------------------------------
-- 9. REPAIR REQUESTS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read own repair requests" ON public.repair_requests;
CREATE POLICY "Customers can read own repair requests"
  ON public.repair_requests FOR SELECT
  USING (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Mechanics can read requests for jobs or matches" ON public.repair_requests;
CREATE POLICY "Mechanics can read requests for jobs or matches"
  ON public.repair_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.request_id = repair_requests.id
        AND j.mechanic_id = public.get_mechanic_id(auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.mechanic_matches m
      WHERE m.request_id = repair_requests.id
        AND m.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can insert own repair requests" ON public.repair_requests;
CREATE POLICY "Customers can insert own repair requests"
  ON public.repair_requests FOR INSERT
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Customers can update own repair requests" ON public.repair_requests;
CREATE POLICY "Customers can update own repair requests"
  ON public.repair_requests FOR UPDATE
  USING (customer_id = public.get_customer_id(auth.uid()))
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Customers can delete own pending repair requests" ON public.repair_requests;
CREATE POLICY "Customers can delete own pending repair requests"
  ON public.repair_requests FOR DELETE
  USING (
    customer_id = public.get_customer_id(auth.uid())
    AND status = 'requested'
  );

DROP POLICY IF EXISTS "Admins can manage all repair requests" ON public.repair_requests;
CREATE POLICY "Admins can manage all repair requests"
  ON public.repair_requests FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 10. REQUEST MEDIA POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read own request media" ON public.request_media;
CREATE POLICY "Customers can read own request media"
  ON public.request_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_requests r
      WHERE r.id = request_media.request_id
        AND r.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mechanics can read media for matched or assigned requests" ON public.request_media;
CREATE POLICY "Mechanics can read media for matched or assigned requests"
  ON public.request_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_requests r
      JOIN public.jobs j ON r.id = j.request_id
      WHERE r.id = request_media.request_id
        AND j.mechanic_id = public.get_mechanic_id(auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.mechanic_matches m
      WHERE m.request_id = request_media.request_id
        AND m.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can insert media for own requests" ON public.request_media;
CREATE POLICY "Customers can insert media for own requests"
  ON public.request_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repair_requests r
      WHERE r.id = request_media.request_id
        AND r.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can delete media for own requests" ON public.request_media;
CREATE POLICY "Customers can delete media for own requests"
  ON public.request_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_requests r
      WHERE r.id = request_media.request_id
        AND r.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all request media" ON public.request_media;
CREATE POLICY "Admins can manage all request media"
  ON public.request_media FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 11. MECHANIC MATCHES POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Mechanics can read own matches" ON public.mechanic_matches;
CREATE POLICY "Mechanics can read own matches"
  ON public.mechanic_matches FOR SELECT
  USING (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Mechanics can update own matches" ON public.mechanic_matches;
CREATE POLICY "Mechanics can update own matches"
  ON public.mechanic_matches FOR UPDATE
  USING (mechanic_id = public.get_mechanic_id(auth.uid()))
  WITH CHECK (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all matches" ON public.mechanic_matches;
CREATE POLICY "Admins can manage all matches"
  ON public.mechanic_matches FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 12. JOBS POLICIES (Only service role can insert/update)
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read own jobs" ON public.jobs;
CREATE POLICY "Customers can read own jobs"
  ON public.jobs FOR SELECT
  USING (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Mechanics can read assigned jobs" ON public.jobs;
CREATE POLICY "Mechanics can read assigned jobs"
  ON public.jobs FOR SELECT
  USING (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all jobs" ON public.jobs;
CREATE POLICY "Admins can read all jobs"
  ON public.jobs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Backend transitions handled via service role (bypasses RLS)
DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;
CREATE POLICY "Admins can manage all jobs"
  ON public.jobs FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 13. JOB STATUS HISTORY POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read job history" ON public.job_status_history;
CREATE POLICY "Customers can read job history"
  ON public.job_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_status_history.job_id
        AND j.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mechanics can read job history" ON public.job_status_history;
CREATE POLICY "Mechanics can read job history"
  ON public.job_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_status_history.job_id
        AND j.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can read all job history" ON public.job_status_history;
CREATE POLICY "Admins can read all job history"
  ON public.job_status_history FOR SELECT
  USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 14. SECURE CODES POLICIES
-- No public / authenticated read access. Codes verified via server functions only.
-- Service role bypasses RLS to manage codes.
-- -------------------------------------------------------------
-- Explicitly: No policies added for authenticated or anon users.

-- -------------------------------------------------------------
-- 15. QUOTES POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read quotes for their jobs" ON public.quotes;
CREATE POLICY "Customers can read quotes for their jobs"
  ON public.quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = quotes.job_id
        AND j.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mechanics can read quotes for their jobs" ON public.quotes;
CREATE POLICY "Mechanics can read quotes for their jobs"
  ON public.quotes FOR SELECT
  USING (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Mechanics can insert quotes for their jobs" ON public.quotes;
CREATE POLICY "Mechanics can insert quotes for their jobs"
  ON public.quotes FOR INSERT
  WITH CHECK (
    mechanic_id = public.get_mechanic_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = quotes.job_id
        AND j.mechanic_id = quotes.mechanic_id
    )
  );

DROP POLICY IF EXISTS "Mechanics can update quotes for their jobs" ON public.quotes;
CREATE POLICY "Mechanics can update quotes for their jobs"
  ON public.quotes FOR UPDATE
  USING (
    mechanic_id = public.get_mechanic_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = quotes.job_id
        AND j.mechanic_id = quotes.mechanic_id
    )
  )
  WITH CHECK (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Customers can respond to quotes for their jobs" ON public.quotes;
CREATE POLICY "Customers can respond to quotes for their jobs"
  ON public.quotes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = quotes.job_id
        AND j.customer_id = public.get_customer_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = quotes.job_id
        AND j.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
CREATE POLICY "Admins can manage all quotes"
  ON public.quotes FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 16. QUOTE LINE ITEMS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read quote line items" ON public.quote_line_items;
CREATE POLICY "Customers can read quote line items"
  ON public.quote_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      JOIN public.jobs j ON q.job_id = j.id
      WHERE q.id = quote_line_items.quote_id
        AND j.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mechanics can read quote line items" ON public.quote_line_items;
CREATE POLICY "Mechanics can read quote line items"
  ON public.quote_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_line_items.quote_id
        AND q.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mechanics can manage quote line items" ON public.quote_line_items;
CREATE POLICY "Mechanics can manage quote line items"
  ON public.quote_line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_line_items.quote_id
        AND q.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_line_items.quote_id
        AND q.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all quote line items" ON public.quote_line_items;
CREATE POLICY "Admins can manage all quote line items"
  ON public.quote_line_items FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 17. INVOICES POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read own invoices" ON public.invoices;
CREATE POLICY "Customers can read own invoices"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = invoices.job_id
        AND j.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mechanics can read invoices for their jobs" ON public.invoices;
CREATE POLICY "Mechanics can read invoices for their jobs"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = invoices.job_id
        AND j.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.invoices;
CREATE POLICY "Admins can manage all invoices"
  ON public.invoices FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 18. INVOICE ITEMS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read invoice items" ON public.invoice_items;
CREATE POLICY "Customers can read invoice items"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.jobs j ON i.job_id = j.id
      WHERE i.id = invoice_items.invoice_id
        AND j.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mechanics can read invoice items for their jobs" ON public.invoice_items;
CREATE POLICY "Mechanics can read invoice items for their jobs"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.jobs j ON i.job_id = j.id
      WHERE i.id = invoice_items.invoice_id
        AND j.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all invoice items" ON public.invoice_items;
CREATE POLICY "Admins can manage all invoice items"
  ON public.invoice_items FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 19. PAYMENTS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read own payments" ON public.payments;
CREATE POLICY "Customers can read own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.jobs j ON i.job_id = j.id
      WHERE i.id = payments.invoice_id
        AND j.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mechanics can read payments for their jobs" ON public.payments;
CREATE POLICY "Mechanics can read payments for their jobs"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.jobs j ON i.job_id = j.id
      WHERE i.id = payments.invoice_id
        AND j.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admins can manage all payments"
  ON public.payments FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 20. PAYMENT EVENTS POLICIES (Webhook & Audit)
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read payment events" ON public.payment_events;
CREATE POLICY "Admins can read payment events"
  ON public.payment_events FOR SELECT
  USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 21. PLATFORM COMMISSIONS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Mechanics can read own commissions" ON public.platform_commissions;
CREATE POLICY "Mechanics can read own commissions"
  ON public.platform_commissions FOR SELECT
  USING (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all commissions" ON public.platform_commissions;
CREATE POLICY "Admins can manage all commissions"
  ON public.platform_commissions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 22. MECHANIC BALANCES POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Mechanics can read own balance" ON public.mechanic_balances;
CREATE POLICY "Mechanics can read own balance"
  ON public.mechanic_balances FOR SELECT
  USING (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all balances" ON public.mechanic_balances;
CREATE POLICY "Admins can manage all balances"
  ON public.mechanic_balances FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 23. SETTLEMENTS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Mechanics can read own settlements" ON public.settlements;
CREATE POLICY "Mechanics can read own settlements"
  ON public.settlements FOR SELECT
  USING (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage settlements" ON public.settlements;
CREATE POLICY "Admins can manage settlements"
  ON public.settlements FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 24. REFUNDS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can read own refunds" ON public.refunds;
CREATE POLICY "Customers can read own refunds"
  ON public.refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      JOIN public.invoices i ON p.invoice_id = i.id
      JOIN public.jobs j ON i.job_id = j.id
      WHERE p.id = refunds.payment_id
        AND j.customer_id = public.get_customer_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mechanics can read refunds for their jobs" ON public.refunds;
CREATE POLICY "Mechanics can read refunds for their jobs"
  ON public.refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      JOIN public.invoices i ON p.invoice_id = i.id
      JOIN public.jobs j ON i.job_id = j.id
      WHERE p.id = refunds.payment_id
        AND j.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage refunds" ON public.refunds;
CREATE POLICY "Admins can manage refunds"
  ON public.refunds FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 25. REVIEWS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Customer can insert review for completed job" ON public.reviews;
CREATE POLICY "Customer can insert review for completed job"
  ON public.reviews FOR INSERT
  WITH CHECK (
    customer_id = public.get_customer_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = reviews.job_id
        AND j.customer_id = reviews.customer_id
        AND j.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Admins can manage reviews"
  ON public.reviews FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 26. NOTIFICATIONS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 27. SUPPORT TICKETS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own tickets" ON public.support_tickets;
CREATE POLICY "Users can read own tickets"
  ON public.support_tickets FOR SELECT
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert tickets" ON public.support_tickets;
CREATE POLICY "Users can insert tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage support tickets" ON public.support_tickets;
CREATE POLICY "Admins can manage support tickets"
  ON public.support_tickets FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 28. APP SETTINGS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.app_settings;
CREATE POLICY "Authenticated users can read settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 29. SERVICE REGIONS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read active service regions" ON public.service_regions;
CREATE POLICY "Authenticated users can read active service regions"
  ON public.service_regions FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage service regions" ON public.service_regions;
CREATE POLICY "Admins can manage service regions"
  ON public.service_regions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------
-- 30. AUDIT LOGS POLICIES
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));
