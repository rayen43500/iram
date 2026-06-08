import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { FONTS, RADIUS, SPACING, TYPO } from './theme';
import { InputLabel, PrimaryButton, SecondaryButton, SectionTitle } from './components';
import { professionalStatusLabel } from './atbCreditForm';

function BilingualLabel({ fr, ar, colors }) {
  return (
    <Text style={[styles.bilingual, { color: colors.textSecondary }]}>
      {fr} <Text style={{ color: colors.textLight }}>/ {ar}</Text>
    </Text>
  );
}

function SectionHeader({ title, subtitle, colors }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + '25' }]}>
      <View style={[styles.sectionHeaderAccent, { backgroundColor: colors.primary }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionHeaderSub, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function Chip({ label, active, onPress, colors }) {
  return (
    <Pressable
      style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.inputFill }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, { color: colors.textSecondary }, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function CheckRow({ label, checked, onPress, colors }) {
  return (
    <Pressable style={styles.checkRow} onPress={onPress}>
      <View style={[styles.checkBox, { borderColor: colors.border }, checked && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        {checked ? <CheckCircle2 size={12} color={colors.white} /> : null}
      </View>
      <Text style={[styles.checkLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export default function AtbCreditApplicationForm({
  form,
  setForm,
  user,
  amount,
  durationMonths,
  creditName,
  colors,
  onSubmit,
  onDownloadPdf,
  disabled,
}) {
  const themed = { colors };
  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const patchIncome = (key, value) => setForm((prev) => ({
    ...prev,
    otherIncomeSources: { ...prev.otherIncomeSources, [key]: value },
  }));

  const input = [styles.input, { borderColor: colors.border, backgroundColor: colors.inputFill, color: colors.text }];

  return (
    <View style={styles.wrap}>
      <View style={[styles.atbBanner, { backgroundColor: colors.primary }]}>
        <Text style={styles.atbBannerTitle}>البنك العربي لتونس</Text>
        <Text style={styles.atbBannerSub}>Arab Tunisian Bank — ATB</Text>
        <Text style={styles.atbBannerForm}>Demande de Crédit aux particuliers / طلب قرض للأشخاص</Text>
        <Text style={styles.atbBannerPage}>Page 1/1 — DCRT/03-2016/V3</Text>
      </View>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Formulaire officiel ATB. Renseignez les sections ci-dessous puis soumettez après estimation.
      </Text>

      <View style={styles.metaRow}>
        <View style={{ flex: 1 }}>
          <BilingualLabel fr="Agence" ar="الفرع" colors={colors} />
          <TextInput style={input} value={form.agency} onChangeText={(v) => patch('agency', v)} placeholder="Ex: Tunis Lafayette" placeholderTextColor={colors.textLight} />
        </View>
        <View style={{ flex: 1 }}>
          <BilingualLabel fr="N° de compte" ar="رقم الحساب" colors={colors} />
          <TextInput style={[input, { opacity: 0.85 }]} value={user?.accountNumber || '—'} editable={false} />
        </View>
      </View>

      <SectionHeader title="1. Demandeur de crédit (client 1)" subtitle="بيانات شخصية للطالب الأول للقرض" colors={colors} />
      <BilingualLabel fr="Nom et prénom" ar="الاسم واللقب" colors={colors} />
      <TextInput style={[input, { opacity: 0.85 }]} value={user?.fullName || ''} editable={false} />

      <BilingualLabel fr="Type de pièce d'identité" ar="نوعية الوثيقة الرئيسية" colors={colors} />
      <View style={styles.chipRow}>
        <Chip label="CIN" active={form.idType === 'cin'} onPress={() => patch('idType', 'cin')} colors={colors} />
        <Chip label="Carte séjour" active={form.idType === 'carte_sejour'} onPress={() => patch('idType', 'carte_sejour')} colors={colors} />
        <Chip label="Passeport" active={form.idType === 'passeport'} onPress={() => patch('idType', 'passeport')} colors={colors} />
      </View>
      <InputLabel {...themed}>N° pièce / رقم الوثيقة</InputLabel>
      <TextInput style={input} value={form.idNumber} onChangeText={(v) => patch('idNumber', v)} keyboardType="numeric" placeholderTextColor={colors.textLight} />

      <BilingualLabel fr="Situation professionnelle" ar="الوضع الوظيفي" colors={colors} />
      <View style={styles.chipRow}>
        {['titulaire', 'contractuel', 'retraite', 'professionnel'].map((st) => (
          <Chip key={st} label={professionalStatusLabel(st).split(' / ')[0]} active={form.professionalStatus === st} onPress={() => patch('professionalStatus', st)} colors={colors} />
        ))}
      </View>

      <BilingualLabel fr="Téléphone" ar="الهاتف" colors={colors} />
      <TextInput style={input} value={form.phone} onChangeText={(v) => patch('phone', v)} placeholder="+216 XX XXX XXX" keyboardType="phone-pad" placeholderTextColor={colors.textLight} />
      <BilingualLabel fr="Ville / adresse" ar="العنوان" colors={colors} />
      <TextInput style={input} value={form.address} onChangeText={(v) => patch('address', v)} placeholder="Ville, rue…" placeholderTextColor={colors.textLight} />

      <BilingualLabel fr="Revenu net mensuel (TND)" ar="الراتب الشهري الصافي" colors={colors} />
      <TextInput style={[input, { opacity: 0.85 }]} value={String(user?.salary ?? '')} editable={false} />

      <BilingualLabel fr="Autres sources de revenus" ar="مصادر دخل أخرى" colors={colors} />
      <CheckRow label="Affaires personnelles / أعمال خاصة" checked={form.otherIncomeSources.personal} onPress={() => patchIncome('personal', !form.otherIncomeSources.personal)} colors={colors} />
      <CheckRow label="Dividendes / عوائد استثمار" checked={form.otherIncomeSources.dividends} onPress={() => patchIncome('dividends', !form.otherIncomeSources.dividends)} colors={colors} />
      <CheckRow label="Revenus placements / ودائع بنكية" checked={form.otherIncomeSources.banking} onPress={() => patchIncome('banking', !form.otherIncomeSources.banking)} colors={colors} />
      <CheckRow label="Loyers / ايجارات" checked={form.otherIncomeSources.rents} onPress={() => patchIncome('rents', !form.otherIncomeSources.rents)} colors={colors} />
      <CheckRow label="Autres / أخرى" checked={form.otherIncomeSources.other} onPress={() => patchIncome('other', !form.otherIncomeSources.other)} colors={colors} />
      {form.otherIncomeSources.other ? (
        <TextInput style={input} value={form.otherIncomeOtherText} onChangeText={(v) => patch('otherIncomeOtherText', v)} placeholder="Précisez…" placeholderTextColor={colors.textLight} />
      ) : null}
      <InputLabel {...themed}>Montant autres revenus (TND) / قيمة مصادر الدخل الأخرى</InputLabel>
      <TextInput style={input} value={form.otherIncomeAmount} onChangeText={(v) => patch('otherIncomeAmount', v)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textLight} />

      <SectionHeader title="2. Compte joint (optionnel)" subtitle="الطالب الثاني للقرض" colors={colors} />
      <CheckRow label="Compte joint — 2e demandeur" checked={form.client2Enabled} onPress={() => patch('client2Enabled', !form.client2Enabled)} colors={colors} />
      {form.client2Enabled ? (
        <>
          <TextInput style={input} value={form.client2Name} onChangeText={(v) => patch('client2Name', v)} placeholder="Nom et prénom" placeholderTextColor={colors.textLight} />
          <View style={styles.chipRow}>
            <Chip label="CIN" active={form.client2IdType === 'cin'} onPress={() => patch('client2IdType', 'cin')} colors={colors} />
            <Chip label="Passeport" active={form.client2IdType === 'passeport'} onPress={() => patch('client2IdType', 'passeport')} colors={colors} />
          </View>
          <TextInput style={input} value={form.client2IdNumber} onChangeText={(v) => patch('client2IdNumber', v)} placeholder="N° pièce" placeholderTextColor={colors.textLight} />
          <TextInput style={input} value={form.client2NetSalary} onChangeText={(v) => patch('client2NetSalary', v)} placeholder="Revenu net (TND)" keyboardType="decimal-pad" placeholderTextColor={colors.textLight} />
        </>
      ) : null}

      <SectionHeader title="3. Conjoint (optionnel)" subtitle="بيانات شخصية للقرين" colors={colors} />
      <CheckRow label="Renseigner le conjoint" checked={form.spouseEnabled} onPress={() => patch('spouseEnabled', !form.spouseEnabled)} colors={colors} />
      {form.spouseEnabled ? (
        <>
          <TextInput style={input} value={form.spouseName} onChangeText={(v) => patch('spouseName', v)} placeholder="Nom et prénom" placeholderTextColor={colors.textLight} />
          <TextInput style={input} value={form.spouseAtbAccount} onChangeText={(v) => patch('spouseAtbAccount', v)} placeholder="N° compte ATB" placeholderTextColor={colors.textLight} />
          <TextInput style={input} value={form.spouseEmployer} onChangeText={(v) => patch('spouseEmployer', v)} placeholder="Employeur / المؤسسة" placeholderTextColor={colors.textLight} />
          <TextInput style={input} value={form.spouseNetSalary} onChangeText={(v) => patch('spouseNetSalary', v)} placeholder="Revenu net (TND)" keyboardType="decimal-pad" placeholderTextColor={colors.textLight} />
        </>
      ) : null}

      <SectionHeader title="4. Données du crédit" subtitle="بيانات القرض المطلوب" colors={colors} />
      <BilingualLabel fr="Montant sollicité (TND)" ar="مبلغ القرض المطلوب" colors={colors} />
      <TextInput style={[input, { opacity: 0.85 }]} value={String(amount || '')} editable={false} />
      <BilingualLabel fr="Durée (mois)" ar="مدة القرض" colors={colors} />
      <TextInput style={[input, { opacity: 0.85 }]} value={String(durationMonths || '')} editable={false} />
      <BilingualLabel fr="Objet du crédit" ar="موضوع القرض" colors={colors} />
      <TextInput
        style={[input, styles.textArea]}
        value={form.creditPurpose}
        onChangeText={(v) => patch('creditPurpose', v)}
        placeholder="Décrivez le projet financé (min. 15 caractères)"
        placeholderTextColor={colors.textLight}
        multiline
        textAlignVertical="top"
      />
      <BilingualLabel fr="Garanties proposées" ar="الضمانات المقدمة" colors={colors} />
      <TextInput style={input} value={form.guarantees} onChangeText={(v) => patch('guarantees', v)} placeholderTextColor={colors.textLight} />

      <BilingualLabel fr="Périodicité de remboursement" ar="دورية تسديد الدين" colors={colors} />
      <View style={styles.chipRow}>
        {[
          ['mensuelle', 'Mensuelle'],
          ['trimestrielle', 'Trimestrielle'],
          ['semestrielle', 'Semestrielle'],
          ['annuelle', 'Annuelle'],
        ].map(([k, lbl]) => (
          <Chip key={k} label={lbl} active={form.repaymentPeriodicity === k} onPress={() => patch('repaymentPeriodicity', k)} colors={colors} />
        ))}
      </View>

      <BilingualLabel fr="Crédit dans le cadre d'une convention" ar="قرض في إطار اتفاقية" colors={colors} />
      <View style={styles.chipRow}>
        <Chip label="Oui / نعم" active={form.convention === 'oui'} onPress={() => patch('convention', 'oui')} colors={colors} />
        <Chip label="Non" active={form.convention === 'non'} onPress={() => patch('convention', 'non')} colors={colors} />
      </View>
      {form.convention === 'oui' ? (
        <TextInput style={input} value={form.conventionName} onChangeText={(v) => patch('conventionName', v)} placeholder="Nom de la convention" placeholderTextColor={colors.textLight} />
      ) : null}

      <SectionHeader title="5. Type de crédit" subtitle={creditName || '—'} colors={colors} />
      <View style={styles.chipRow}>
        <Chip label="Véhicule" active={form.creditCategory === 'vehicule'} onPress={() => patch('creditCategory', 'vehicule')} colors={colors} />
        <Chip label="Immobilier" active={form.creditCategory === 'immobilier'} onPress={() => patch('creditCategory', 'immobilier')} colors={colors} />
        <Chip label="Consommation" active={form.creditCategory === 'consommation'} onPress={() => patch('creditCategory', 'consommation')} colors={colors} />
      </View>

      {form.creditCategory === 'vehicule' ? (
        <>
          <TextInput style={input} value={form.vehicleFiscalPower} onChangeText={(v) => patch('vehicleFiscalPower', v)} placeholder="Puissance fiscale (CV)" placeholderTextColor={colors.textLight} />
          <View style={styles.chipRow}>
            <Chip label="Véhicule neuf" active={form.vehicleIsNew} onPress={() => patch('vehicleIsNew', true)} colors={colors} />
            <Chip label="Occasion" active={!form.vehicleIsNew} onPress={() => patch('vehicleIsNew', false)} colors={colors} />
          </View>
          {!form.vehicleIsNew ? (
            <TextInput style={input} value={form.vehicleFirstCirculation} onChangeText={(v) => patch('vehicleFirstCirculation', v)} placeholder="1ère mise en circulation" placeholderTextColor={colors.textLight} />
          ) : null}
        </>
      ) : null}

      {form.creditCategory === 'immobilier' ? (
        <>
          <CheckRow label="Construction / بناء" checked={form.immoConstruction} onPress={() => patch('immoConstruction', !form.immoConstruction)} colors={colors} />
          <CheckRow label="Aménagement / تحسين" checked={form.immoAmenagement} onPress={() => patch('immoAmenagement', !form.immoAmenagement)} colors={colors} />
          <CheckRow label="Terrain / أرض" checked={form.immoTerrain} onPress={() => patch('immoTerrain', !form.immoTerrain)} colors={colors} />
          <CheckRow label="Achat promoteur" checked={form.immoPromoter} onPress={() => patch('immoPromoter', !form.immoPromoter)} colors={colors} />
          <CheckRow label="Achat particulier" checked={form.immoParticulier} onPress={() => patch('immoParticulier', !form.immoParticulier)} colors={colors} />
          <TextInput style={input} value={form.propertyValue} onChangeText={(v) => patch('propertyValue', v)} placeholder="Valeur bien / travaux (TND)" keyboardType="decimal-pad" placeholderTextColor={colors.textLight} />
        </>
      ) : null}

      <BilingualLabel fr="Type de remboursement" ar="نوع التسديد" colors={colors} />
      <View style={styles.chipRow}>
        <Chip label="Constant" active={form.repaymentType === 'constant'} onPress={() => patch('repaymentType', 'constant')} colors={colors} />
        <Chip label="Non constant" active={form.repaymentType === 'non_constant'} onPress={() => patch('repaymentType', 'non_constant')} colors={colors} />
      </View>

      <InputLabel {...themed}>Remarques complémentaires</InputLabel>
      <TextInput style={[input, styles.textArea]} value={form.additionalNotes} onChangeText={(v) => patch('additionalNotes', v)} multiline textAlignVertical="top" placeholderTextColor={colors.textLight} />

      <SectionHeader title="6. Déclaration & signatures" subtitle="التصريح والامضاء" colors={colors} />
      <CheckRow
        label="Je certifie l'exactitude des informations fournies / أصرح بصحة المعلومات"
        checked={form.acceptsDeclaration}
        onPress={() => patch('acceptsDeclaration', !form.acceptsDeclaration)}
        colors={colors}
      />

      <View style={styles.actionBlock}>
        <SecondaryButton label="Télécharger le formulaire PDF" onPress={onDownloadPdf} disabled={disabled} colors={colors} />
        <PrimaryButton label="Soumettre la demande ATB" onPress={onSubmit} disabled={disabled} colors={colors} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.lg, marginTop: SPACING.md },
  atbBanner: { borderRadius: RADIUS.lg, padding: SPACING.xl, gap: 4, overflow: 'hidden' },
  atbBannerTitle: { fontFamily: FONTS.bold, fontSize: 17, color: '#fff', textAlign: 'right', letterSpacing: 0.5 },
  atbBannerSub: { fontFamily: FONTS.extraBold, fontSize: 15, color: 'rgba(255,255,255,0.96)', letterSpacing: 0.3 },
  atbBannerForm: { fontFamily: FONTS.semiBold, ...TYPO.small, color: 'rgba(255,255,255,0.88)', marginTop: 8 },
  atbBannerPage: { fontFamily: FONTS.medium, ...TYPO.caption, color: 'rgba(255,255,255,0.65)', marginTop: 4, letterSpacing: 0.5 },
  hint: { fontFamily: FONTS.regular, ...TYPO.small, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  sectionHeaderAccent: { width: 3, borderRadius: 2 },
  sectionHeaderTitle: { fontFamily: FONTS.bold, ...TYPO.body },
  sectionHeaderSub: { fontFamily: FONTS.medium, ...TYPO.caption, textAlign: 'right', marginTop: 2 },
  bilingual: { fontFamily: FONTS.semiBold, ...TYPO.caption, marginBottom: 6, marginTop: 6, letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 13, fontFamily: FONTS.medium, ...TYPO.body, minHeight: 50 },
  textArea: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: FONTS.semiBold, ...TYPO.small },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 6 },
  checkBox: { width: 22, height: 22, borderRadius: RADIUS.xs, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkLabel: { flex: 1, fontFamily: FONTS.medium, ...TYPO.small },
  actionBlock: { gap: SPACING.lg, marginTop: SPACING.xl, marginBottom: SPACING.md },
});
