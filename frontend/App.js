import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, RefreshControl, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions, Modal
} from 'react-native';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, CreditCard, Calculator, MessageCircle, ShieldCheck, Wallet, Banknote, LogOut, RefreshCw, User, Send, ChevronRight, TrendingUp, Clock, CheckCircle2, XCircle, BarChart3, Users, FileText, Search, Filter } from 'lucide-react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { apiRequest } from './src/api';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from './src/theme';
import { StatusBadge, EmptyState, BottomTabBar, KpiCard, SectionCard, SectionTitle, PrimaryButton, SecondaryButton, InputLabel, ChatBubble } from './src/components';

const ATB_LOGO = require('./assets/image.png');

function formatMoney(v) { return `${Number(v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} TND`; }
function formatPercent(v) { const n = Number(v || 0) * (v <= 1 ? 100 : 1); return `${n.toFixed(1)}%`; }

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('admin@bank.local');
  const [password, setPassword] = useState('Admin@1234');
  const [salary, setSalary] = useState('2500');
  const [balance, setBalance] = useState('1000');
  const [dashboard, setDashboard] = useState(null);
  const [creditTypes, setCreditTypes] = useState([]);
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminRequests, setAdminRequests] = useState([]);
  const [selectedCreditTypeId, setSelectedCreditTypeId] = useState('');
  const [amount, setAmount] = useState('10000');
  const [durationMonths, setDurationMonths] = useState('36');
  const [estimationResult, setEstimationResult] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [editingCreditTypeId, setEditingCreditTypeId] = useState(null);
  const [editingRate, setEditingRate] = useState('');
  const [editingIsActive, setEditingIsActive] = useState(true);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [adminSelectedRequest, setAdminSelectedRequest] = useState(null);
  const [adminRejectionReason, setAdminRejectionReason] = useState('');

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'admin';
  const selectedType = useMemo(() => creditTypes.find((i) => String(i.id) === String(selectedCreditTypeId)), [creditTypes, selectedCreditTypeId]);

  useEffect(() => { if (isAuthenticated) loadInitialData(); }, [isAuthenticated]);

  async function loadInitialData() {
    try {
      setError(''); setNotice(''); setIsLoadingData(true);
      const [me, dashData, types] = await Promise.all([
        apiRequest('/auth/me', {}, token), apiRequest('/credits/dashboard', {}, token), apiRequest('/credits/types', {}, token),
      ]);
      setUser(me); setDashboard(dashData); setCreditTypes(types);
      if (types.length > 0) setSelectedCreditTypeId((c) => c || String(types[0].id));
      if (me.role === 'admin') {
        const [summary, reqs] = await Promise.all([apiRequest('/admin/analytics/summary', {}, token), apiRequest('/admin/requests', {}, token)]);
        setAdminSummary(summary); setAdminRequests(reqs);
      }
    } catch (e) { setError(e.message || 'Erreur de chargement.'); }
    finally { setIsLoadingData(false); }
  }

  async function onRegister() {
    const n = fullName.trim(); const e = email.trim().toLowerCase();
    if (!n || !e || !password) { setError('Nom, email et mot de passe obligatoires.'); return; }
    try {
      setError(''); setNotice(''); setIsAuthBusy(true);
      const r = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ fullName: n, email: e, password, salary: Number(salary || 0), balance: Number(balance || 0) }) });
      setToken(r.token); setUser(r.user); setView(r.user.role === 'admin' ? 'admin' : 'dashboard'); setNotice('Compte créé avec succès !');
    } catch (err) { setError(err.message || 'Inscription impossible.'); } finally { setIsAuthBusy(false); }
  }

  async function onLogin() {
    const e = email.trim().toLowerCase();
    if (!e || !password) { setError('Email et mot de passe obligatoires.'); return; }
    try {
      setError(''); setNotice(''); setIsAuthBusy(true);
      const r = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: e, password }) });
      setToken(r.token); setUser(r.user); setView(r.user.role === 'admin' ? 'admin' : 'dashboard'); setNotice('Connexion réussie !');
    } catch (err) { setError(err.message || 'Connexion impossible.'); } finally { setIsAuthBusy(false); }
  }

  function onLogout() {
    setToken(''); setUser(null); setView('dashboard'); setDashboard(null); setCreditTypes([]);
    setSelectedCreditTypeId(''); setEstimationResult(null); setChatMessages([]); setAdminSummary(null); setAdminRequests([]); setNotice(''); setError('');
  }

  function validateSim() {
    if (!selectedCreditTypeId) return 'Sélectionne un type de crédit.';
    const a = Number(amount), d = Number(durationMonths);
    if (!Number.isFinite(a) || a <= 0) return 'Le montant doit être positif.';
    if (!Number.isFinite(d) || d <= 0) return 'La durée doit être positive.';
    if (selectedType) {
      if (a < selectedType.minAmount || a > selectedType.maxAmount) return `Montant: ${selectedType.minAmount} – ${selectedType.maxAmount}`;
      if (d < selectedType.minDurationMonths || d > selectedType.maxDurationMonths) return `Durée: ${selectedType.minDurationMonths} – ${selectedType.maxDurationMonths} mois`;
    }
    return '';
  }

  async function onEstimate() {
    const ve = validateSim(); if (ve) { setError(ve); return; }
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      const sal = Number(dashboard?.client?.salary || user?.salary || 0);
      const r = await apiRequest('/estimation', { method: 'POST', body: JSON.stringify({ creditTypeId: Number(selectedCreditTypeId), amount: Number(amount), durationMonths: Number(durationMonths), salary: sal }) }, token);
      setEstimationResult(r); setNotice('Estimation calculée !');
    } catch (e) { setError(e.message || 'Estimation impossible.'); } finally { setIsActionBusy(false); }
  }

  async function onSubmitRequest() {
    const ve = validateSim(); if (ve) { setError(ve); return; }
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      await apiRequest('/requests', { method: 'POST', body: JSON.stringify({ creditTypeId: Number(selectedCreditTypeId), requestedAmount: Number(amount), requestedDurationMonths: Number(durationMonths) }) }, token);
      await loadInitialData(); setView('dashboard'); setNotice('Demande soumise avec succès !');
    } catch (e) { setError(e.message || 'Envoi impossible.'); } finally { setIsActionBusy(false); }
  }

  async function onChat() {
    const q = chatQuestion.trim(); if (!q) { setError('Écris une question.'); return; }
    setChatMessages((p) => [...p, { text: q, isUser: true }]); setChatQuestion('');
    try {
      setError(''); setIsActionBusy(true);
      const r = await apiRequest('/chatbot', { method: 'POST', body: JSON.stringify({ message: q }) }, token);
      setChatMessages((p) => [...p, { text: r.answer || 'Aucune réponse.', isUser: false }]);
    } catch (e) { setChatMessages((p) => [...p, { text: 'Erreur: ' + (e.message || 'Chatbot indisponible.'), isUser: false }]); } finally { setIsActionBusy(false); }
  }

  async function onUpdateRequestStatus(id, status, adminComment = '') {
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      await apiRequest(`/admin/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, adminComment }) }, token);
      await loadInitialData();
      setAdminSelectedRequest(null);
      setNotice('Statut mis à jour.');
    } catch (e) { setError(e.message || 'Mise à jour impossible.'); } finally { setIsActionBusy(false); }
  }

  async function onUpdateCreditType(id) {
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      await apiRequest(`/admin/credit-types/${id}`, { method: 'PATCH', body: JSON.stringify({ annualRate: Number(editingRate), isActive: editingIsActive }) }, token);
      setEditingCreditTypeId(null);
      await loadInitialData(); setNotice('Type de crédit mis à jour.');
    } catch (e) { setError(e.message || 'Mise à jour impossible.'); } finally { setIsActionBusy(false); }
  }

  const tabsClient = [
    { key: 'dashboard', label: 'Accueil', icon: Home },
    { key: 'credits', label: 'Crédits', icon: CreditCard },
    { key: 'simulation', label: 'Simulation', icon: Calculator },
    { key: 'chatbot', label: 'Assistant', icon: MessageCircle },
  ];
  const tabsAdmin = [
    { key: 'admin', label: 'Dashboard', icon: ShieldCheck },
    { key: 'chatbot', label: 'Assistant', icon: MessageCircle },
  ];

  // ─── SPLASH ───
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.splash}>
          <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={s.splashGrad}>
            <Image source={ATB_LOGO} style={s.splashLogo} resizeMode="contain" />
            <Text style={s.splashTitle}>ATB</Text>
            <Text style={s.splashSub}>Mobile Banking</Text>
            <ActivityIndicator color={COLORS.white} size="large" style={{ marginTop: 24 }} />
          </LinearGradient>
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  // ─── AUTH ───
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.authWrap} keyboardShouldPersistTaps="handled">
          <View style={s.authHeader}>
            <Image source={ATB_LOGO} style={s.authLogo} resizeMode="contain" />
            <Text style={s.authTitle}>ATB</Text>
            <Text style={s.authSubtitle}>Votre espace bancaire intelligent</Text>
          </View>

          <View style={s.authCard}>
            <View style={s.authToggle}>
              <Pressable style={[s.authToggleBtn, authMode === 'login' && s.authToggleBtnActive]} onPress={() => setAuthMode('login')}>
                <Text style={[s.authToggleText, authMode === 'login' && s.authToggleTextActive]}>Connexion</Text>
              </Pressable>
              <Pressable style={[s.authToggleBtn, authMode === 'register' && s.authToggleBtnActive]} onPress={() => setAuthMode('register')}>
                <Text style={[s.authToggleText, authMode === 'register' && s.authToggleTextActive]}>Inscription</Text>
              </Pressable>
            </View>

            {authMode === 'register' && (
              <>
                <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Nom complet" placeholderTextColor={COLORS.textLight} />
                <View style={s.rowInputs}>
                  <TextInput style={[s.input, { flex: 1 }]} value={salary} onChangeText={setSalary} placeholder="Salaire" keyboardType="numeric" placeholderTextColor={COLORS.textLight} />
                  <TextInput style={[s.input, { flex: 1 }]} value={balance} onChangeText={setBalance} placeholder="Solde" keyboardType="numeric" placeholderTextColor={COLORS.textLight} />
                </View>
              </>
            )}
            <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Email" placeholderTextColor={COLORS.textLight} keyboardType="email-address" />
            <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Mot de passe" placeholderTextColor={COLORS.textLight} />

            <PrimaryButton label={authMode === 'login' ? 'Se connecter' : 'Créer le compte'} onPress={authMode === 'login' ? onLogin : onRegister} disabled={isAuthBusy} loading={isAuthBusy} />

            <Text style={s.helper}>Comptes test : admin@bank.local / Admin@1234{'\n'}client1@bank.local / Client@1234</Text>
            {notice ? <Text style={s.noticeText}>{notice}</Text> : null}
            {error ? <Text style={s.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  // ─── MAIN APP ───
  const loans = dashboard?.loans || [];
  const requests = dashboard?.requests || [];

  const filteredAdminRequests = adminRequests.filter((r) => {
    const searchMatch = (r.User?.fullName || '').toLowerCase().includes(adminSearchQuery.toLowerCase());
    const statusMatch = adminStatusFilter === 'all' || r.status === adminStatusFilter;
    return searchMatch && statusMatch;
  });

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Image source={ATB_LOGO} style={s.headerLogo} resizeMode="contain" />
          <View>
            <Text style={s.headerGreet}>Bonjour 👋</Text>
            <Text style={s.headerName}>{user?.fullName}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={loadInitialData} disabled={isLoadingData} style={s.headerIconBtn}>
            <RefreshCw size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} style={s.headerIconBtn}>
            <LogOut size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} refreshControl={<RefreshControl refreshing={isLoadingData} onRefresh={loadInitialData} tintColor={COLORS.primary} />}>
        {notice ? <View style={s.noticeBanner}><CheckCircle2 size={16} color={COLORS.success} /><Text style={s.noticeText}>{notice}</Text></View> : null}
        {error ? <View style={s.errorBanner}><XCircle size={16} color={COLORS.error} /><Text style={s.errorText}>{error}</Text></View> : null}

        {isLoadingData && <View style={s.loadingBox}><ActivityIndicator color={COLORS.primary} /><Text style={s.loadingText}>Chargement…</Text></View>}

        {/* ── DASHBOARD ── */}
        {view === 'dashboard' && (
          <>
            <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={s.balanceCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={s.balanceTop}>
                <Text style={s.balanceLabel}>Solde disponible</Text>
                <Wallet size={22} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={s.balanceAmount}>{formatMoney(dashboard?.client?.balance)}</Text>
              <View style={s.balanceBottom}>
                <Text style={s.balanceSalary}>Salaire : {formatMoney(dashboard?.client?.salary)}</Text>
              </View>
              <View style={s.balanceDecor} />
              <View style={s.balanceDecor2} />
            </LinearGradient>

            <View style={s.kpiRow}>
              <KpiCard icon={CreditCard} label="Crédits" value={loans.length} color={COLORS.secondary} />
              <KpiCard icon={Clock} label="Demandes" value={requests.length} color={COLORS.warning} />
            </View>

            <SectionCard>
              <SectionTitle>Crédits existants</SectionTitle>
              {loans.length === 0 ? <EmptyState icon="💳" title="Aucun crédit actif" description="Lancez une simulation pour démarrer." /> : loans.map((l) => (
                <View style={s.listItem} key={l.id}>
                  <View style={s.listItemHead}><Text style={s.listItemTitle}>{l.CreditType?.name || 'Crédit'}</Text><StatusBadge status={l.status} /></View>
                  <Text style={s.listItemSub}>Montant : {formatMoney(l.amount)} • {l.durationMonths} mois</Text>
                  <Text style={s.listItemSub}>Mensualité : {formatMoney(l.monthlyPayment)} • Restant : {l.remainingInstallments}</Text>
                </View>
              ))}
            </SectionCard>

            <SectionCard>
              <SectionTitle>Demandes récentes</SectionTitle>
              {requests.length === 0 ? <EmptyState icon="📋" title="Aucune demande" description="Soumettez votre première demande." /> : requests.map((r) => (
                <View style={s.listItem} key={r.id}>
                  <View style={s.listItemHead}><Text style={s.listItemTitle}>{r.CreditType?.name || 'Crédit'}</Text><StatusBadge status={r.status} /></View>
                  <Text style={s.listItemSub}>{formatMoney(r.requestedAmount)} sur {r.requestedDurationMonths} mois</Text>
                  <Text style={s.listItemSub}>Probabilité : {formatPercent(r.acceptanceProbability || 0)}</Text>
                </View>
              ))}
            </SectionCard>
          </>
        )}

        {/* ── CREDITS ── */}
        {view === 'credits' && (
          <SectionCard>
            <SectionTitle>Types de crédits</SectionTitle>
            {creditTypes.length === 0 ? <EmptyState icon="📁" title="Aucun type" description="Vérifiez les données seed." /> : creditTypes.map((t) => {
              const active = String(t.id) === String(selectedCreditTypeId);
              return (
                <Pressable key={t.id} style={[s.creditType, active && s.creditTypeActive]} onPress={() => setSelectedCreditTypeId(String(t.id))}>
                  <View style={s.listItemHead}>
                    <Text style={s.listItemTitle}>{t.name}</Text>
                    <View style={s.rateTag}><Text style={s.rateTagText}>{t.annualRate}%</Text></View>
                  </View>
                  <Text style={s.listItemSub}>{t.description}</Text>
                  <Text style={s.listItemSub}>Montant : {formatMoney(t.minAmount)} – {formatMoney(t.maxAmount)}</Text>
                  <Text style={s.listItemSub}>Durée : {t.minDurationMonths} – {t.maxDurationMonths} mois</Text>
                  <Text style={s.listItemSub}>Documents : {(t.requiredDocuments || []).join(', ') || 'N/A'}</Text>
                  {active && <View style={s.checkMark}><CheckCircle2 size={18} color={COLORS.primary} /></View>}
                </Pressable>
              );
            })}
          </SectionCard>
        )}

        {/* ── SIMULATION ── */}
        {view === 'simulation' && (
          <SectionCard>
            <SectionTitle>Simulation de crédit</SectionTitle>
            <View style={s.chipRow}>
              <CreditCard size={16} color={COLORS.primary} />
              <Text style={s.chipText}>Type : {selectedType?.name || 'Aucun sélectionné'}</Text>
            </View>
            <InputLabel>Montant (TND)</InputLabel>
            <TextInput style={s.input} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="Ex: 10000" placeholderTextColor={COLORS.textLight} />
            <InputLabel>Durée (mois)</InputLabel>
            <TextInput style={s.input} keyboardType="numeric" value={durationMonths} onChangeText={setDurationMonths} placeholder="Ex: 36" placeholderTextColor={COLORS.textLight} />

            <PrimaryButton label="Calculer l'estimation" onPress={onEstimate} disabled={isActionBusy} loading={isActionBusy} />
            <SecondaryButton label="Soumettre la demande" onPress={onSubmitRequest} disabled={isActionBusy} />

            {estimationResult && (
              <View style={s.resultCard}>
                <Text style={s.resultTitle}>Résultat de l'estimation</Text>
                <View style={s.resultRow}><Text style={s.resultLabel}>Mensualité</Text><Text style={s.resultValue}>{formatMoney(estimationResult.estimation.monthlyPayment)}</Text></View>
                <View style={s.resultRow}><Text style={s.resultLabel}>Coût total</Text><Text style={s.resultValue}>{formatMoney(estimationResult.estimation.totalCost)}</Text></View>
                <View style={s.resultRow}><Text style={s.resultLabel}>Ratio endettement</Text><Text style={s.resultValue}>{formatPercent(estimationResult.estimation.debtRatio)}</Text></View>
                <View style={s.resultRow}><Text style={s.resultLabel}>Probabilité</Text><Text style={[s.resultValue, { color: COLORS.success }]}>{formatPercent(estimationResult.estimation.acceptanceProbability)}</Text></View>
              </View>
            )}
          </SectionCard>
        )}

        {/* ── CHATBOT ── */}
        {view === 'chatbot' && (
          <SectionCard style={{ flex: 1 }}>
            <View style={s.chatHeader}><MessageCircle size={20} color={COLORS.primary} /><SectionTitle>Assistant Iram</SectionTitle></View>
            <View style={s.chatZone}>
              {chatMessages.length === 0 && <EmptyState icon="🤖" title="Bienvenue !" description="Posez vos questions sur les crédits." />}
              {chatMessages.map((m, i) => <ChatBubble key={i} text={m.text} isUser={m.isUser} />)}
            </View>
            <View style={s.chatInputRow}>
              <TextInput style={s.chatInput} value={chatQuestion} onChangeText={setChatQuestion} placeholder="Écrivez votre message…" placeholderTextColor={COLORS.textLight} />
              <Pressable style={s.chatSendBtn} onPress={onChat} disabled={isActionBusy}>
                <Send size={18} color={COLORS.white} />
              </Pressable>
            </View>
          </SectionCard>
        )}

        {/* ── ADMIN ── */}
        {isAdmin && view === 'admin' && (
          <>
            <SectionCard>
              <SectionTitle>Vue analytique</SectionTitle>
              {adminSummary ? (
                <>
                  <View style={s.adminGrid}>
                    <KpiCard icon={FileText} label="Total demandes" value={adminSummary.totalRequests} color={COLORS.primary} />
                    <KpiCard icon={Clock} label="En attente" value={adminSummary.pendingRequests} color={COLORS.warning} />
                    <KpiCard icon={CheckCircle2} label="Acceptées" value={adminSummary.acceptedRequests} color={COLORS.success} />
                    <KpiCard icon={XCircle} label="Refusées" value={adminSummary.rejectedRequests} color={COLORS.error} />
                    <KpiCard icon={TrendingUp} label="Taux" value={formatPercent(adminSummary.acceptanceRate)} color={COLORS.success} />
                    <KpiCard icon={Banknote} label="Montant total" value={formatMoney(adminSummary.totalRequested)} color={COLORS.secondary} />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }}>
                    <View style={{ flex: 1, minWidth: 250, alignItems: 'center' }}>
                      <Text style={{ fontFamily: FONTS.semiBold, marginBottom: 8 }}>Répartition des demandes</Text>
                      <PieChart
                        data={[
                          { name: 'En attente', count: adminSummary.pendingRequests, color: COLORS.warning, legendFontColor: '#7A7A7A', legendFontSize: 12 },
                          { name: 'Acceptées', count: adminSummary.acceptedRequests, color: COLORS.success, legendFontColor: '#7A7A7A', legendFontSize: 12 },
                          { name: 'Refusées', count: adminSummary.rejectedRequests, color: COLORS.error, legendFontColor: '#7A7A7A', legendFontSize: 12 },
                        ]}
                        width={Dimensions.get('window').width < 600 ? Dimensions.get('window').width - 64 : 300}
                        height={180}
                        chartConfig={{ color: () => COLORS.primary }}
                        accessor="count"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                      />
                    </View>
                  </View>
                </>
              ) : <EmptyState icon="📊" title="Pas de stats" description="Ajoutez des demandes." />}
            </SectionCard>

            <SectionCard>
              <SectionTitle>Gestion des demandes</SectionTitle>

              <View style={{ marginBottom: 16 }}>
                <View style={[s.input, { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
                  <Search size={20} color={COLORS.textLight} />
                  <TextInput
                    style={{ flex: 1, marginLeft: 8, outlineStyle: 'none' }}
                    placeholder="Rechercher par nom..."
                    value={adminSearchQuery}
                    onChangeText={setAdminSearchQuery}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {['all', 'pending', 'accepted', 'rejected'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[s.filterChip, adminStatusFilter === status && s.filterChipActive]}
                      onPress={() => setAdminStatusFilter(status)}
                    >
                      <Text style={[s.filterChipText, adminStatusFilter === status && s.filterChipTextActive]}>
                        {status === 'all' ? 'Toutes' : status === 'pending' ? 'En attente' : status === 'accepted' ? 'Acceptées' : 'Refusées'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {filteredAdminRequests.length === 0 ? <EmptyState icon="📋" title="Aucune demande" description="Aucune demande ne correspond aux critères." /> : filteredAdminRequests.map((r) => (
                <TouchableOpacity style={s.listItem} key={r.id} onPress={() => setAdminSelectedRequest(r)}>
                  <View style={s.listItemHead}><Text style={s.listItemTitle}>{r.User?.fullName || 'Client'}</Text><StatusBadge status={r.status} /></View>
                  <Text style={s.listItemSub}>{r.CreditType?.name || 'Type'} – {formatMoney(r.requestedAmount)} • {r.requestedDurationMonths} mois</Text>
                  <Text style={[s.listItemSub, { marginTop: 4, color: COLORS.primary }]}>Voir les détails {'>'}</Text>
                </TouchableOpacity>
              ))}
            </SectionCard>
          </>
        )}

        {isAdmin && view === 'admin' && (
          <SectionCard>
            <SectionTitle>Offres de crédit</SectionTitle>
            {creditTypes.map((ct) => (
              <View style={s.listItem} key={ct.id}>
                {editingCreditTypeId === ct.id ? (
                  <View style={{ gap: 8 }}>
                    <Text style={s.listItemTitle}>Édition : {ct.name}</Text>
                    <View style={s.rowInputs}>
                      <View style={{ flex: 1 }}>
                        <InputLabel>Taux Annuel (%)</InputLabel>
                        <TextInput style={s.input} keyboardType="numeric" value={String(editingRate)} onChangeText={setEditingRate} />
                      </View>
                      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                        <TouchableOpacity style={[s.adminBtn, { backgroundColor: editingIsActive ? COLORS.success : COLORS.textLight, paddingVertical: 14 }]} onPress={() => setEditingIsActive(!editingIsActive)}>
                          <Text style={[s.adminBtnText, { textAlign: 'center' }]}>{editingIsActive ? 'Statut: Actif' : 'Statut: Inactif'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={s.adminActions}>
                      <TouchableOpacity style={[s.adminBtn, { backgroundColor: COLORS.primary, flex: 1 }]} onPress={() => onUpdateCreditType(ct.id)} disabled={isActionBusy}><Text style={[s.adminBtnText, { textAlign: 'center' }]}>Enregistrer</Text></TouchableOpacity>
                      <TouchableOpacity style={[s.adminBtn, { backgroundColor: COLORS.textSecondary }]} onPress={() => setEditingCreditTypeId(null)}><Text style={s.adminBtnText}>Annuler</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={s.listItemHead}>
                      <Text style={s.listItemTitle}>{ct.name}</Text>
                      <StatusBadge status={ct.isActive ? 'active' : 'En attente'} />
                    </View>
                    <Text style={s.listItemSub}>Taux: {ct.annualRate}% • {ct.minDurationMonths}-{ct.maxDurationMonths} mois • {formatMoney(ct.minAmount)} - {formatMoney(ct.maxAmount)}</Text>
                    <View style={s.adminActions}>
                      <TouchableOpacity style={[s.adminBtn, { backgroundColor: COLORS.secondary }]} onPress={() => { setEditingCreditTypeId(ct.id); setEditingRate(String(ct.annualRate)); setEditingIsActive(ct.isActive); }}>
                        <Text style={s.adminBtnText}>Modifier Offre</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}
          </SectionCard>
        )}
      </ScrollView>

      {/* ── MODAL DETAIL DOSSIER ── */}
      {adminSelectedRequest && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setAdminSelectedRequest(null)}>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Détail du Dossier</Text>
                <TouchableOpacity onPress={() => setAdminSelectedRequest(null)}><XCircle size={24} color={COLORS.textLight} /></TouchableOpacity>
              </View>
              <ScrollView style={{ padding: SPACING.lg, maxHeight: Dimensions.get('window').height * 0.7 }}>
                <SectionTitle>Informations Client</SectionTitle>
                <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Nom</Text><Text style={s.resultValue}>{adminSelectedRequest.User?.fullName}</Text></View>
                <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Email</Text><Text style={s.resultValue}>{adminSelectedRequest.User?.email}</Text></View>
                <View style={[s.resultRow, { marginBottom: 16 }]}><Text style={s.resultLabel}>Salaire</Text><Text style={s.resultValue}>{formatMoney(adminSelectedRequest.salaryAtRequest || adminSelectedRequest.User?.salary)}</Text></View>

                <SectionTitle>Détails du Crédit</SectionTitle>
                <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Type</Text><Text style={s.resultValue}>{adminSelectedRequest.CreditType?.name}</Text></View>
                <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Montant demandé</Text><Text style={s.resultValue}>{formatMoney(adminSelectedRequest.requestedAmount)}</Text></View>
                <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Durée</Text><Text style={s.resultValue}>{adminSelectedRequest.requestedDurationMonths} mois</Text></View>
                <View style={[s.resultRow, { marginBottom: 16 }]}><Text style={s.resultLabel}>Probabilité IA</Text><Text style={s.resultValue}>{formatPercent(adminSelectedRequest.acceptanceProbability)}</Text></View>

                <SectionTitle>Scoring et Décision</SectionTitle>
                <View style={[s.resultRow, { marginBottom: 16 }]}>
                  <Text style={s.resultLabel}>Ratio d'endettement estimé</Text>
                  <Text style={[s.resultValue, { color: adminSelectedRequest.debtRatio < 0.35 ? COLORS.success : adminSelectedRequest.debtRatio <= 0.45 ? COLORS.warning : COLORS.error }]}>
                    {formatPercent(adminSelectedRequest.debtRatio || 0)}
                    {adminSelectedRequest.debtRatio < 0.35 ? ' 🟢 Faible' : adminSelectedRequest.debtRatio <= 0.45 ? ' 🟡 Moyen' : ' 🔴 Risqué'}
                  </Text>
                </View>

                {adminSelectedRequest.status === 'pending' && (
                  <View style={{ gap: 12 }}>
                    <PrimaryButton label="✔ Accepter le crédit" onPress={() => onUpdateRequestStatus(adminSelectedRequest.id, 'accepted')} disabled={isActionBusy} />
                    <View style={{ borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 12 }}>
                      <InputLabel>Motif de refus (optionnel)</InputLabel>
                      <TextInput style={s.input} value={adminRejectionReason} onChangeText={setAdminRejectionReason} placeholder="Ex: Ratio d'endettement trop élevé" />
                      <SecondaryButton label="✖ Refuser le crédit" onPress={() => onUpdateRequestStatus(adminSelectedRequest.id, 'rejected', adminRejectionReason)} disabled={isActionBusy} />
                    </View>
                  </View>
                )}
                {adminSelectedRequest.status !== 'pending' && (
                  <View style={s.noticeBanner}><CheckCircle2 size={16} color={COLORS.primary} /><Text style={s.noticeText}>Dossier clôturé ({adminSelectedRequest.status})</Text></View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <BottomTabBar tabs={isAdmin ? tabsAdmin : tabsClient} active={view} onPress={setView} />
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

// ─── STYLES ───
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  // Splash
  splash: { flex: 1 },
  splashGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashLogo: { width: 80, height: 80, borderRadius: 20, marginBottom: 16 },
  splashTitle: { fontFamily: FONTS.extraBold, fontSize: 36, color: COLORS.white, letterSpacing: 1 },
  splashSub: { fontFamily: FONTS.medium, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  // Auth
  authWrap: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl, gap: SPACING.xl },
  authHeader: { alignItems: 'center', gap: 8 },
  authLogo: { width: 70, height: 70, borderRadius: 18 },
  authTitle: { fontFamily: FONTS.extraBold, fontSize: 32, color: COLORS.primary },
  authSubtitle: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSecondary },
  authCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.md, ...SHADOW.card },
  authToggle: { flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 4, gap: 4 },
  authToggleBtn: { flex: 1, borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center' },
  authToggleBtnActive: { backgroundColor: COLORS.primary, ...SHADOW.elevated },
  authToggleText: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 14 },
  authToggleTextActive: { color: COLORS.white },
  rowInputs: { flexDirection: 'row', gap: SPACING.sm },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: COLORS.surface, color: COLORS.text, fontFamily: FONTS.medium, fontSize: 14 },
  helper: { fontSize: 11, color: COLORS.textLight, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 17 },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerLogo: { width: 34, height: 34, borderRadius: 10 },
  headerGreet: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  headerName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  headerRight: { flexDirection: 'row', gap: 6 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  // Body
  body: { flex: 1 },
  bodyContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 24 },
  // Notices
  noticeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.successBg, borderRadius: RADIUS.md, padding: SPACING.md },
  noticeText: { color: COLORS.success, fontFamily: FONTS.semiBold, fontSize: 13, flex: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.errorBg, borderRadius: RADIUS.md, padding: SPACING.md },
  errorText: { color: COLORS.error, fontFamily: FONTS.semiBold, fontSize: 13, flex: 1 },
  loadingBox: { alignItems: 'center', gap: 8, padding: SPACING.xl },
  loadingText: { fontFamily: FONTS.semiBold, color: COLORS.primary, fontSize: 13 },
  // Balance card
  balanceCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, overflow: 'hidden', ...SHADOW.elevated },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  balanceAmount: { fontFamily: FONTS.extraBold, fontSize: 32, color: COLORS.white, marginTop: 8 },
  balanceBottom: { marginTop: 12 },
  balanceSalary: { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  balanceDecor: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
  balanceDecor2: { position: 'absolute', bottom: -50, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
  // KPI
  kpiRow: { flexDirection: 'row', gap: SPACING.md },
  // List items
  listItem: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, padding: SPACING.md, gap: 4, backgroundColor: COLORS.surface },
  listItemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  listItemTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14, flexShrink: 1 },
  listItemSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13 },
  // Credit types
  creditType: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 4, backgroundColor: COLORS.surface },
  creditTypeActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  rateTag: { backgroundColor: COLORS.primary + '12', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  rateTagText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },
  checkMark: { position: 'absolute', top: 12, right: 12 },
  // Simulation
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm, padding: SPACING.sm },
  chipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary },
  resultCard: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: SPACING.lg, gap: 10, marginTop: 8 },
  resultTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text, marginBottom: 4 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  resultValue: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  // Chat
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatZone: { minHeight: 200, gap: 4 },
  chatInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW.elevated },
  // Admin
  adminGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  adminActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  adminBtn: { borderRadius: RADIUS.sm, paddingVertical: 8, paddingHorizontal: 12 },
  adminBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, width: '90%', maxWidth: 500, borderRadius: RADIUS.xl, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primaryDark },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textLight },
  filterChipTextActive: { color: COLORS.white },
});
