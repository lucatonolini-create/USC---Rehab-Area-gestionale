-- OSIICS v13.5 seed (part 5/5) — Orchard et al.
-- Classificazione basata su OSIICS v13.5 - Orchard et al., Journal of Sport and Health Science

INSERT INTO osiics_codes (id, codice, descrizione_ita, descrizione_eng, regione_anatomica, categoria_patologia, versione)
VALUES
  ('4ce7dc52-b1ab-49b7-8b8e-dd9cf277e817', 'MDBXD', 'Skin Lesion/Tumour thoracic', 'Skin Lesion/Tumour thoracic', 'Medical', '', 'v13.5'),
  ('54946b94-8a5c-4465-94b0-750e326b3144', 'MDBX', 'Skin Lesion/Tumour', 'Skin Lesion/Tumour', 'Medical', '', 'v13.5'),
  ('dbf9f40e-412d-426e-bb05-91a2afc91758', 'MDDX', 'Drug-related skin rash', 'Drug-related skin rash', 'Medical', '', 'v13.5'),
  ('8473db8e-188f-40b1-9f36-24d9196e53e6', 'MDBB', 'Basal cell carcinoma (BCC)', 'Basal cell carcinoma (BCC)', 'Medical', '', 'v13.5'),
  ('b1bf4a87-7de8-45e2-8bc4-9a9ad1f9820b', 'MDBS', 'Squamous cell carcinoma SCC', 'Squamous cell carcinoma SCC', 'Medical', '', 'v13.5'),
  ('6e256c0e-0853-4897-8757-69136917744d', 'MCZ1', 'Cardiac preparticipation screening', 'Cardiac preparticipation screening', 'Medical', '', 'v13.5'),
  ('31d1dcbb-d9f0-49d4-b82c-bdf8b50aa444', 'MDBE', 'Melanoma', 'Melanoma', 'Medical', '', 'v13.5'),
  ('7b1857db-9d62-4bfb-a010-686e889f28ca', 'MDBM', 'Multiple skin cancers', 'Multiple skin cancers', 'Medical', '', 'v13.5'),
  ('ea7d2e41-3f2f-4b27-b142-3f22be6a0049', 'MRBXX', 'Other tumour not otherwise mentioned', 'Other tumour not otherwise mentioned', 'Medical', '', 'v13.5'),
  ('9bea29ba-6129-4987-95a1-1742140d6512', 'MXDD', 'Drug use/overdose/poisoning', 'Drug use/overdose/poisoning', 'Medical', '', 'v13.5'),
  ('efe8de0a-edca-4764-bbb9-e911ada5247c', 'MZXX', 'Medical Illness Undiagnosed/Other', 'Medical Illness Undiagnosed/Other', 'Medical', '', 'v13.5'),
  ('abc0a40f-8438-42a2-b3b1-c4ad86984dca', 'MXN1', 'Tired athlete undiagnosed', 'Tired athlete undiagnosed', 'Medical', '', 'v13.5'),
  ('d7f611c4-6cb9-437c-b549-24c77ee0b974', 'MXNS', 'Advice on legality of drug/supplement', 'Advice on legality of drug/supplement', 'Medical', '', 'v13.5'),
  ('f63ee4c2-f3a4-4d2e-9fc2-0918e1dec6c5', 'MZZX', 'Other medical illness', 'Other medical illness', 'Medical', '', 'v13.5'),
  ('96dfcdc0-afd2-4499-8063-873cfd16d100', 'MYYF', 'Chronic Fatigue Syndrome', 'Chronic Fatigue Syndrome', 'Medical', '', 'v13.5'),
  ('03b90d46-cf0e-4d30-a5f5-1a025acb08a7', 'MZZO', 'Obesity', 'Obesity', 'Medical', '', 'v13.5'),
  ('1eb5fe36-084a-4576-bc0e-1770ccc8e346', 'MRJA', 'Exercise prescription for patient with arthritis', 'Exercise prescription for patient with arthritis', 'Medical', '', 'v13.5'),
  ('0c06d9e7-c7f0-4e9b-a4e6-0837b021f98a', 'MYJO', 'Exercise prescription for patient with obesity', 'Exercise prescription for patient with obesity', 'Medical', '', 'v13.5'),
  ('053626d9-b981-4b9a-85d1-e6304f667f64', 'MZZP', 'Paperwork', 'Paperwork', 'Medical', '', 'v13.5'),
  ('7e6e494c-1d8f-4963-8f9f-957e4490385a', 'MZZC', 'Medical certificate', 'Medical certificate', 'Medical', '', 'v13.5'),
  ('d8a2d68c-6449-4165-9cd4-fec1fc963ef7', 'MZZZ', 'Referral', 'Referral', 'Medical', '', 'v13.5'),
  ('498e68c3-32db-485c-87eb-8afe9ca00d37', 'MZZR', 'Prescription repeat', 'Prescription repeat', 'Medical', '', 'v13.5'),
  ('3eb6ff0a-2faa-4356-b70e-3879ea08d89c', 'MZZ4', 'Exercise prescription', 'Exercise prescription', 'Medical', '', 'v13.5'),
  ('8380dc4d-5d1c-42b7-872f-84614b6a81bc', 'MZZ3', 'Preparation for overseas travel - advice immunisations', 'Preparation for overseas travel - advice immunisations', 'Medical', '', 'v13.5'),
  ('db2c9947-5f33-4744-92f8-f3454d2d5686', 'MZZE', 'Advice on equipment/other aids e.g. appropriate footwear.', 'Advice on equipment/other aids e.g. appropriate footwear.', 'Medical', '', 'v13.5'),
  ('dfe5a939-7926-4fcd-9331-b2f0ea2978e1', 'MZZ1', 'Consultation', 'Consultation', 'Medical', '', 'v13.5'),
  ('eaed68b6-5fb4-4a0a-9b1f-7b4535eed60b', 'MZZ2', 'Screening', 'Screening', 'Medical', '', 'v13.5'),
  ('89e4e912-d281-4886-a1b4-998114bfc0d1', 'MZZ6', 'Education', 'Education', 'Medical', '', 'v13.5')
ON CONFLICT (codice) DO UPDATE SET
  descrizione_ita = EXCLUDED.descrizione_ita,
  descrizione_eng = EXCLUDED.descrizione_eng,
  regione_anatomica = EXCLUDED.regione_anatomica,
  categoria_patologia = EXCLUDED.categoria_patologia,
  versione = EXCLUDED.versione;
