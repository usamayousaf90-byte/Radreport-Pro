const { randomUUID } = require("node:crypto");
const { isDbConfigured, query, withTransaction } = require("../lib/db");
const { hashPassword } = require("../lib/password");

async function upsertOrganization(client, org) {
  var rows = await client.query(
    "insert into organizations (name, slug, subdomain, status) values ($1, $2, $3, 'active') on conflict (slug) do update set name = excluded.name, subdomain = excluded.subdomain, updated_at = now() returning id",
    [org.name, org.slug, org.subdomain]
  );
  return rows.rows[0].id;
}

async function upsertSettings(client, organizationId, settings) {
  await client.query(
    "insert into organization_settings (organization_id, clinic_name, logo_url, phone, address) values ($1, $2, $3, $4, $5) on conflict (organization_id) do update set clinic_name = excluded.clinic_name, logo_url = excluded.logo_url, phone = excluded.phone, address = excluded.address, updated_at = now()",
    [organizationId, settings.clinic_name, settings.logo_url, settings.phone, settings.address]
  );
}

async function upsertUser(client, organizationId, user) {
  var passwordHash = hashPassword(user.password);
  await client.query(
    "insert into users (organization_id, username, email, full_name, role, password_hash) values ($1, $2, $3, $4, $5, $6) on conflict (organization_id, username) do update set email = excluded.email, full_name = excluded.full_name, role = excluded.role, password_hash = excluded.password_hash, updated_at = now()",
    [organizationId, user.username, user.email || null, user.full_name, user.role, passwordHash]
  );
}

async function upsertPatient(client, organizationId, createdBy, patient) {
  await client.query(
    "insert into patients (organization_id, id, mrno, full_name, payload, created_by, updated_by) values ($1, $2, $3, $4, $5::jsonb, $6, $6) on conflict (organization_id, id) do update set mrno = excluded.mrno, full_name = excluded.full_name, payload = excluded.payload, updated_by = excluded.updated_by, updated_at = now()",
    [organizationId, patient.id, patient.mrno, patient.full_name, JSON.stringify(patient.payload), createdBy]
  );
}

async function upsertDoctor(client, organizationId, createdBy, doctor) {
  await client.query(
    "insert into doctors (organization_id, id, name, payload, created_by, updated_by) values ($1, $2, $3, $4::jsonb, $5, $5) on conflict (organization_id, id) do update set name = excluded.name, payload = excluded.payload, updated_by = excluded.updated_by, updated_at = now()",
    [organizationId, doctor.id, doctor.name, JSON.stringify(doctor.payload), createdBy]
  );
}

async function upsertTemplate(client, organizationId, createdBy, template) {
  await client.query(
    "insert into templates (organization_id, id, code, name, modality, region, is_system, payload, created_by, updated_by) values ($1, $2, $3, $4, $5, $6, false, $7::jsonb, $8, $8) on conflict (organization_id, id) do update set code = excluded.code, name = excluded.name, modality = excluded.modality, region = excluded.region, payload = excluded.payload, updated_by = excluded.updated_by, updated_at = now()",
    [organizationId, template.id, template.code, template.name, template.modality, template.region, JSON.stringify(template.payload), createdBy]
  );
}

async function upsertReport(client, organizationId, createdBy, report) {
  await client.query(
    "insert into reports (organization_id, id, patient_id, label, modality, region, status, payload, created_by, updated_by, finalized_by, finalized_at) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $9, $10, $11) on conflict (organization_id, id) do update set patient_id = excluded.patient_id, label = excluded.label, modality = excluded.modality, region = excluded.region, status = excluded.status, payload = excluded.payload, updated_by = excluded.updated_by, finalized_by = excluded.finalized_by, finalized_at = excluded.finalized_at, updated_at = now()",
    [organizationId, report.id, report.patient_id, report.label, report.modality, report.region, report.status, JSON.stringify(report.payload), createdBy, report.finalized_by || "", report.finalized_at || null]
  );
}

async function upsertInvoice(client, organizationId, createdBy, invoice) {
  await client.query(
    "insert into invoices (organization_id, id, patient_id, invoice_number, status, payload, created_by, updated_by) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $7) on conflict (organization_id, id) do update set patient_id = excluded.patient_id, invoice_number = excluded.invoice_number, status = excluded.status, payload = excluded.payload, updated_by = excluded.updated_by, updated_at = now()",
    [organizationId, invoice.id, invoice.patient_id, invoice.invoice_number, invoice.status, JSON.stringify(invoice.payload), createdBy]
  );
}

async function getUserId(client, organizationId, username) {
  var rows = await client.query("select id from users where organization_id = $1 and username = $2 limit 1", [organizationId, username]);
  return rows.rows[0] ? rows.rows[0].id : null;
}

async function seedOrganization(client, org) {
  var organizationId = await upsertOrganization(client, org.organization);
  await upsertSettings(client, organizationId, org.settings);
  for (var i = 0; i < org.users.length; i += 1) {
    await upsertUser(client, organizationId, org.users[i]);
  }
  var adminId = await getUserId(client, organizationId, org.users[0].username);
  await upsertPatient(client, organizationId, adminId, org.patient);
  await upsertDoctor(client, organizationId, adminId, org.doctor);
  await upsertTemplate(client, organizationId, adminId, org.template);
  await upsertReport(client, organizationId, adminId, org.reportDraft);
  await upsertReport(client, organizationId, adminId, org.reportFinal);
  await upsertInvoice(client, organizationId, adminId, org.invoice);
}

async function main() {
  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL is missing. Set it before running demo seed.");
  }

  var organizations = [
    {
      organization: { name: "RadReport Platform", slug: "platform", subdomain: "platform" },
      settings: { clinic_name: "RadReport Platform", logo_url: "", phone: "+1 555 0000", address: "Platform HQ" },
      users: [
        { username: "superadmin", email: "superadmin@radreportpro.online", full_name: "Platform Super Admin", role: "super_admin", password: "ChangeMeNow123!" }
      ],
      patient: { id: "platform_patient_demo", mrno: "PLAT-001", full_name: "Platform Demo", payload: { id: "platform_patient_demo", mrno: "PLAT-001", name: "Platform Demo" } },
      doctor: { id: "platform_doctor_demo", name: "Platform Doctor", payload: { id: "platform_doctor_demo", name: "Platform Doctor" } },
      template: { id: "platform_template_demo", code: "PLAT-US-ABD", name: "Platform Demo Template", modality: "Ultrasound", region: "Abdomen", payload: { id: "platform_template_demo", name: "Platform Demo Template" } },
      reportDraft: { id: "platform_draft_demo", patient_id: "platform_patient_demo", label: "Platform Draft Demo", modality: "Ultrasound", region: "Abdomen", status: "draft", payload: { id: "platform_draft_demo", label: "Platform Draft Demo", modality: "Ultrasound", region: "Abdomen", patient: { name: "Platform Demo", mrno: "PLAT-001" } } },
      reportFinal: { id: "platform_report_demo", patient_id: "platform_patient_demo", label: "Platform Final Demo", modality: "Ultrasound", region: "Abdomen", status: "finalized", finalized_by: "superadmin", finalized_at: new Date().toISOString(), payload: { id: "platform_report_demo", label: "Platform Final Demo", modality: "Ultrasound", region: "Abdomen", patient: { name: "Platform Demo", mrno: "PLAT-001" }, finalizedAt: new Date().toISOString() } },
      invoice: { id: "platform_invoice_demo", patient_id: "platform_patient_demo", invoice_number: "INV-PLAT-001", status: "paid", payload: { id: "platform_invoice_demo", total: 1000, status: "paid" } }
    },
    {
      organization: { name: "Al Noor Diagnostics", slug: "alnoor", subdomain: "alnoor" },
      settings: { clinic_name: "Al Noor Diagnostics", logo_url: "", phone: "+92 300 1111111", address: "Main Boulevard, Lahore" },
      users: [
        { username: "alnoor_admin", email: "admin@alnoor.demo", full_name: "Al Noor Admin", role: "organization_admin", password: "ChangeMeNow123!" },
        { username: "alnoor_rad", email: "rad@alnoor.demo", full_name: "Al Noor Radiologist", role: "radiologist", password: "ChangeMeNow123!" },
        { username: "alnoor_frontdesk", email: "desk@alnoor.demo", full_name: "Al Noor Reception", role: "receptionist", password: "ChangeMeNow123!" },
        { username: "alnoor_ref", email: "ref@alnoor.demo", full_name: "Al Noor Referrer", role: "referring_doctor", password: "ChangeMeNow123!" }
      ],
      patient: { id: "patient_alnoor_001", mrno: "AN-202603-0001", full_name: "Sara Khan", payload: { id: "patient_alnoor_001", mrno: "AN-202603-0001", name: "Sara Khan", studyDate: "2026-03-07", requestedModality: "Ultrasound", requestedRegion: "Abdomen" } },
      doctor: { id: "doctor_alnoor_001", name: "Dr. Al Noor Radiologist", payload: { id: "doctor_alnoor_001", name: "Dr. Al Noor Radiologist", specialty: "Diagnostic Radiologist" } },
      template: { id: "template_alnoor_001", code: "AN-US-ABD", name: "US Abdomen", modality: "Ultrasound", region: "Abdomen", payload: { id: "template_alnoor_001", code: "AN-US-ABD", name: "US Abdomen" } },
      reportDraft: { id: "draft_alnoor_001", patient_id: "patient_alnoor_001", label: "Sara Khan Draft", modality: "Ultrasound", region: "Abdomen", status: "draft", payload: { id: "draft_alnoor_001", label: "Sara Khan Draft", modality: "Ultrasound", region: "Abdomen", patient: { name: "Sara Khan", mrno: "AN-202603-0001" } } },
      reportFinal: { id: "report_alnoor_001", patient_id: "patient_alnoor_001", label: "Sara Khan Final", modality: "Ultrasound", region: "Abdomen", status: "finalized", finalized_by: "alnoor_rad", finalized_at: new Date().toISOString(), payload: { id: "report_alnoor_001", label: "Sara Khan Final", modality: "Ultrasound", region: "Abdomen", patient: { name: "Sara Khan", mrno: "AN-202603-0001" }, finalizedAt: new Date().toISOString() } },
      invoice: { id: "invoice_alnoor_001", patient_id: "patient_alnoor_001", invoice_number: "INV-AN-001", status: "paid", payload: { id: "invoice_alnoor_001", total: 3500, status: "paid" } }
    },
    {
      organization: { name: "City Diagnostics", slug: "citydiag", subdomain: "citydiag" },
      settings: { clinic_name: "City Diagnostics", logo_url: "", phone: "+92 300 2222222", address: "Canal Road, Faisalabad" },
      users: [
        { username: "city_admin", email: "admin@citydiag.demo", full_name: "City Admin", role: "organization_admin", password: "ChangeMeNow123!" },
        { username: "city_rad", email: "rad@citydiag.demo", full_name: "City Radiologist", role: "radiologist", password: "ChangeMeNow123!" },
        { username: "city_frontdesk", email: "desk@citydiag.demo", full_name: "City Reception", role: "receptionist", password: "ChangeMeNow123!" },
        { username: "city_ref", email: "ref@citydiag.demo", full_name: "City Referrer", role: "referring_doctor", password: "ChangeMeNow123!" }
      ],
      patient: { id: "patient_city_001", mrno: "CD-202603-0001", full_name: "Ahmed Raza", payload: { id: "patient_city_001", mrno: "CD-202603-0001", name: "Ahmed Raza", studyDate: "2026-03-07", requestedModality: "CT Scan", requestedRegion: "Chest" } },
      doctor: { id: "doctor_city_001", name: "Dr. City Radiologist", payload: { id: "doctor_city_001", name: "Dr. City Radiologist", specialty: "Diagnostic Radiologist" } },
      template: { id: "template_city_001", code: "CD-CT-CHEST", name: "CT Chest", modality: "CT Scan", region: "Chest", payload: { id: "template_city_001", code: "CD-CT-CHEST", name: "CT Chest" } },
      reportDraft: { id: "draft_city_001", patient_id: "patient_city_001", label: "Ahmed Raza Draft", modality: "CT Scan", region: "Chest", status: "draft", payload: { id: "draft_city_001", label: "Ahmed Raza Draft", modality: "CT Scan", region: "Chest", patient: { name: "Ahmed Raza", mrno: "CD-202603-0001" } } },
      reportFinal: { id: "report_city_001", patient_id: "patient_city_001", label: "Ahmed Raza Final", modality: "CT Scan", region: "Chest", status: "finalized", finalized_by: "city_rad", finalized_at: new Date().toISOString(), payload: { id: "report_city_001", label: "Ahmed Raza Final", modality: "CT Scan", region: "Chest", patient: { name: "Ahmed Raza", mrno: "CD-202603-0001" }, finalizedAt: new Date().toISOString() } },
      invoice: { id: "invoice_city_001", patient_id: "patient_city_001", invoice_number: "INV-CD-001", status: "unpaid", payload: { id: "invoice_city_001", total: 5200, status: "unpaid" } }
    }
  ];

  await withTransaction(async function(client) {
    for (var i = 0; i < organizations.length; i += 1) {
      await seedOrganization(client, organizations[i]);
    }
  });

  console.log("Demo seed complete");
}

main().catch(function(err) {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
