import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { apiRequest } from './src/api';

const ATB_LOGO_URI = 'https://logo.clearbit.com/atb.com.tn';

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [error, setError] = useState('');

  const [authMode, setAuthMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('admin@bank.local');
  const [password, setPassword] = useState('Admin@1234');
  const [salary, setSalary] = useState('2500');
  const [balance, setBalance] = useState('1000');

  const [dashboard, setDashboard] = useState(null);
  const [creditTypes, setCreditTypes] = useState([]);

  const [amount, setAmount] = useState('10000');
  const [durationMonths, setDurationMonths] = useState('36');
  const [selectedCreditTypeId, setSelectedCreditTypeId] = useState('');

  const [estimationResult, setEstimationResult] = useState(null);
  const [chatQuestion, setChatQuestion] = useState('Quels documents sont requis ?');
  const [chatAnswer, setChatAnswer] = useState('');
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminRequests, setAdminRequests] = useState([]);

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'admin';

  const selectedType = useMemo(
    () => creditTypes.find((item) => item._id === selectedCreditTypeId),
    [creditTypes, selectedCreditTypeId]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    loadInitialData();
  }, [isAuthenticated]);

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Image source={{ uri: ATB_LOGO_URI }} style={styles.brandLogo} resizeMode="contain" />
          <ActivityIndicator size="large" color="#0f4a92" />
          <Text style={styles.loadingText}>Chargement du style...</Text>
        </View>
      </SafeAreaView>
    );
  }

  async function loadInitialData() {
    try {
      setError('');
      const [me, dashboardData, types] = await Promise.all([
        apiRequest('/auth/me', {}, token),
        apiRequest('/credits/dashboard', {}, token),
        apiRequest('/credits/types', {}, token),
      ]);

      setUser(me);
      setDashboard(dashboardData);
      setCreditTypes(types);

      if (!selectedCreditTypeId && types.length > 0) {
        setSelectedCreditTypeId(types[0]._id);
      }

      if (me.role === 'admin') {
        const [summary, requests] = await Promise.all([
          apiRequest('/admin/analytics/summary', {}, token),
          apiRequest('/admin/requests', {}, token),
        ]);
        setAdminSummary(summary);
        setAdminRequests(requests);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function onRegister() {
    try {
      setError('');
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          salary: Number(salary),
          balance: Number(balance),
        }),
      });

      setToken(result.token);
      setUser(result.user);
      setAuthMode('login');
    } catch (err) {
      setError(err.message);
    }
  }

  async function onLogin() {
    try {
      setError('');
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setToken(result.token);
      setUser(result.user);
    } catch (err) {
      setError(err.message);
    }
  }

  function onLogout() {
    setToken('');
    setUser(null);
    setDashboard(null);
    setAdminSummary(null);
    setAdminRequests([]);
    setEstimationResult(null);
  }

  async function onEstimate() {
    try {
      setError('');
      const salary = dashboard?.client?.salary || user?.salary || 0;
      const result = await apiRequest(
        '/estimation',
        {
          method: 'POST',
          body: JSON.stringify({
            creditTypeId: selectedCreditTypeId,
            amount: Number(amount),
            durationMonths: Number(durationMonths),
            salary: Number(salary),
          }),
        },
        token
      );

      setEstimationResult(result);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSubmitRequest() {
    try {
      setError('');
      await apiRequest(
        '/requests',
        {
          method: 'POST',
          body: JSON.stringify({
            creditTypeId: selectedCreditTypeId,
            requestedAmount: Number(amount),
            requestedDurationMonths: Number(durationMonths),
          }),
        },
        token
      );

      await loadInitialData();
      setView('dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  async function onChat() {
    try {
      setError('');
      const result = await apiRequest(
        '/chatbot',
        {
          method: 'POST',
          body: JSON.stringify({ message: chatQuestion }),
        },
        token
      );
      setChatAnswer(result.answer);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onUpdateRequestStatus(requestId, status) {
    try {
      setError('');
      await apiRequest(
        `/admin/requests/${requestId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
        token
      );
      await loadInitialData();
      setView('admin');
    } catch (err) {
      setError(err.message);
    }
  }

  function formatStatus(status) {
    if (status === 'pending') return 'en attente';
    if (status === 'accepted') return 'accepte';
    if (status === 'rejected') return 'refuse';
    return status;
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.decorTop} />
        <View style={styles.decorBottom} />
        <View style={styles.authContainer}>
          <View style={styles.brandHero}>
            <Image source={{ uri: ATB_LOGO_URI }} style={styles.brandLogo} resizeMode="contain" />
            <View>
              <Text style={styles.title}>ATB Credit Mobile</Text>
              <Text style={styles.subtitle}>Espace securise clients et administration</Text>
            </View>
          </View>

          <View style={styles.authModeRow}>
            <TouchableOpacity
              style={[styles.authModeButton, authMode === 'login' && styles.authModeButtonActive]}
              onPress={() => setAuthMode('login')}
              activeOpacity={0.88}
            >
              <Text style={[styles.authModeText, authMode === 'login' && styles.authModeTextActive]}>Connexion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authModeButton, authMode === 'register' && styles.authModeButtonActive]}
              onPress={() => setAuthMode('register')}
              activeOpacity={0.88}
            >
              <Text style={[styles.authModeText, authMode === 'register' && styles.authModeTextActive]}>Inscription</Text>
            </TouchableOpacity>
          </View>

          {authMode === 'register' ? (
            <>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nom complet"
                placeholderTextColor="#6d7f98"
              />
              <TextInput
                style={styles.input}
                value={salary}
                onChangeText={setSalary}
                placeholder="Salaire mensuel"
                keyboardType="numeric"
                placeholderTextColor="#6d7f98"
              />
              <TextInput
                style={styles.input}
                value={balance}
                onChangeText={setBalance}
                placeholder="Solde initial"
                keyboardType="numeric"
                placeholderTextColor="#6d7f98"
              />
            </>
          ) : null}

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            placeholder="Email"
            placeholderTextColor="#6d7f98"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Mot de passe"
            placeholderTextColor="#6d7f98"
          />

          {authMode === 'login' ? (
            <TouchableOpacity style={styles.buttonPrimary} onPress={onLogin} activeOpacity={0.88}>
              <Text style={styles.buttonPrimaryText}>Se connecter</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.buttonPrimary} onPress={onRegister} activeOpacity={0.88}>
              <Text style={styles.buttonPrimaryText}>Creer le compte</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.helper}>Comptes seed: admin@bank.local / Admin@1234 et client1@bank.local / Client@1234</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.decorTop} />
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Image source={{ uri: ATB_LOGO_URI }} style={styles.topBarLogo} resizeMode="contain" />
          <Text style={styles.topBarTitle}>Bienvenue {user?.fullName}</Text>
        </View>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.link}>Deconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        <NavButton label="Dashboard" active={view === 'dashboard'} onPress={() => setView('dashboard')} />
        <NavButton label="Credits" active={view === 'credits'} onPress={() => setView('credits')} />
        <NavButton label="Simulation" active={view === 'simulation'} onPress={() => setView('simulation')} />
        <NavButton label="Chatbot" active={view === 'chatbot'} onPress={() => setView('chatbot')} />
        {isAdmin ? <NavButton label="Admin" active={view === 'admin'} onPress={() => setView('admin')} /> : null}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {view === 'dashboard' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tableau de bord</Text>
            <Text>Solde: {dashboard?.client?.balance ?? 0}</Text>
            <Text>Salaire: {dashboard?.client?.salary ?? 0}</Text>
            <Text style={styles.subHeader}>Credits existants</Text>
            {(dashboard?.loans || []).map((loan) => (
              <View style={styles.item} key={loan._id}>
                <Text>{loan.creditType?.name}</Text>
                <Text>Montant: {loan.amount} | Duree: {loan.durationMonths} mois</Text>
                <Text>Echeances restantes: {loan.remainingInstallments} | Etat: {loan.status}</Text>
              </View>
            ))}
            <Text style={styles.subHeader}>Demandes</Text>
            {(dashboard?.requests || []).map((item) => (
              <View style={styles.item} key={item._id}>
                <Text>{item.creditType?.name}</Text>
                <Text>{item.requestedAmount} sur {item.requestedDurationMonths} mois</Text>
                <Text>Statut: {formatStatus(item.status)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {view === 'credits' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Types de credits</Text>
            {creditTypes.map((item) => (
              <TouchableOpacity key={item._id} style={styles.item} onPress={() => setSelectedCreditTypeId(item._id)}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text>{item.description}</Text>
                <Text>Montant: {item.minAmount} - {item.maxAmount}</Text>
                <Text>Duree: {item.minDurationMonths} - {item.maxDurationMonths} mois</Text>
                <Text>Taux annuel: {item.annualRate}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {view === 'simulation' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Estimation et pre-eligibilite</Text>
            <Text>Type choisi: {selectedType?.name || 'Aucun'}</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="Montant" />
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={durationMonths}
              onChangeText={setDurationMonths}
              placeholder="Duree (mois)"
            />

            <TouchableOpacity style={styles.buttonPrimary} onPress={onEstimate} activeOpacity={0.88}>
              <Text style={styles.buttonPrimaryText}>Calculer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonSecondary} onPress={onSubmitRequest} activeOpacity={0.88}>
              <Text style={styles.buttonSecondaryText}>Soumettre la demande</Text>
            </TouchableOpacity>

            {estimationResult ? (
              <View style={styles.resultBox}>
                <Text>Mensualite estimee: {estimationResult.estimation.monthlyPayment}</Text>
                <Text>Cout total estime: {estimationResult.estimation.totalCost}</Text>
                <Text>Ratio endettement: {estimationResult.estimation.debtRatio}</Text>
                <Text>Probabilite acceptation: {estimationResult.estimation.acceptanceProbability}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {view === 'chatbot' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Assistant IA</Text>
            <TextInput style={styles.input} value={chatQuestion} onChangeText={setChatQuestion} placeholder="Pose ta question" />
            <TouchableOpacity style={styles.buttonPrimary} onPress={onChat} activeOpacity={0.88}>
              <Text style={styles.buttonPrimaryText}>Envoyer</Text>
            </TouchableOpacity>
            {chatAnswer ? <Text style={styles.chatAnswer}>{chatAnswer}</Text> : null}
          </View>
        ) : null}

        {isAdmin && adminSummary ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Module analytique (Power BI)</Text>
            <Text>Total demandes: {adminSummary.totalRequests}</Text>
            <Text>Taux acceptation: {adminSummary.acceptanceRate}</Text>
            <Text>Montant total demande: {adminSummary.totalRequested}</Text>
            <Text>Montant moyen demande: {adminSummary.avgRequested}</Text>
          </View>
        ) : null}

        {isAdmin && view === 'admin' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Gestion des statuts de demandes</Text>
            {adminRequests.map((request) => (
              <View style={styles.item} key={request._id}>
                <Text style={styles.itemTitle}>{request.user?.fullName || 'Client'}</Text>
                <Text>{request.creditType?.name} - {request.requestedAmount} / {request.requestedDurationMonths} mois</Text>
                <Text style={styles.statusText}>Statut actuel: {formatStatus(request.status)}</Text>
                <View style={styles.adminActionsRow}>
                  <TouchableOpacity
                    style={[styles.adminActionButton, styles.pendingButton]}
                    onPress={() => onUpdateRequestStatus(request._id, 'pending')}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.adminActionText}>En attente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adminActionButton, styles.acceptedButton]}
                    onPress={() => onUpdateRequestStatus(request._id, 'accepted')}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.adminActionText}>Accepter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adminActionButton, styles.rejectedButton]}
                    onPress={() => onUpdateRequestStatus(request._id, 'rejected')}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.adminActionText}>Refuser</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

function NavButton({ label, active, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.navButton, active && styles.navButtonActive, pressed && styles.navButtonPressed]}
      onPress={onPress}
    >
      <Text style={[styles.navButtonText, active && styles.navButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f6fb',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    color: '#2d4f7f',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  decorTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#e3edf9',
  },
  decorBottom: {
    position: 'absolute',
    bottom: -120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#ffe6d2',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    gap: 12,
  },
  authModeRow: {
    flexDirection: 'row',
    backgroundColor: '#e9f0fb',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  authModeButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  authModeButtonActive: {
    backgroundColor: '#0f4a92',
  },
  authModeText: {
    color: '#1c4e89',
    fontFamily: 'Manrope_700Bold',
  },
  authModeTextActive: {
    color: '#fff',
  },
  brandHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d5e2f2',
    shadowColor: '#113b76',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  brandLogo: {
    width: 62,
    height: 62,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#0f3a74',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: '#365f92',
    fontFamily: 'Manrope_500Medium',
  },
  input: {
    borderWidth: 1,
    borderColor: '#c6d7ea',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    color: '#0f2f57',
  },
  buttonPrimary: {
    backgroundColor: '#0f4a92',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#0f4a92',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.2,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#f28a22',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fffaf5',
  },
  buttonSecondaryText: {
    color: '#d9720e',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.2,
  },
  helper: {
    fontSize: 12,
    color: '#4a6687',
    fontFamily: 'Manrope_500Medium',
  },
  error: {
    color: '#b92d2d',
    fontFamily: 'Manrope_700Bold',
    marginVertical: 6,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d1dff1',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  topBarLogo: {
    width: 28,
    height: 28,
  },
  topBarTitle: {
    fontFamily: 'Manrope_700Bold',
    color: '#123f79',
    flexShrink: 1,
  },
  link: {
    color: '#f28a22',
    textDecorationLine: 'underline',
    fontFamily: 'Manrope_700Bold',
  },
  navRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    backgroundColor: '#f7faff',
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#e5eef9',
  },
  navButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  navButtonActive: {
    backgroundColor: '#0f4a92',
  },
  navButtonText: {
    color: '#0f3a74',
    fontFamily: 'Manrope_600SemiBold',
  },
  navButtonTextActive: {
    color: '#fff',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dce7f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    color: '#0f3a74',
  },
  subHeader: {
    marginTop: 8,
    fontFamily: 'Manrope_700Bold',
    color: '#2d4f7f',
  },
  item: {
    borderWidth: 1,
    borderColor: '#e3ebf7',
    borderRadius: 10,
    padding: 8,
    gap: 2,
    backgroundColor: '#fbfdff',
  },
  itemTitle: {
    fontFamily: 'Manrope_700Bold',
    color: '#123f79',
  },
  resultBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fff3e7',
    gap: 4,
    borderWidth: 1,
    borderColor: '#ffd5b0',
  },
  chatAnswer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#edf4fd',
    color: '#163e74',
    borderWidth: 1,
    borderColor: '#ccdef3',
  },
  statusText: {
    fontFamily: 'Manrope_600SemiBold',
    color: '#315584',
  },
  adminActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  adminActionButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pendingButton: {
    backgroundColor: '#6b7d99',
  },
  acceptedButton: {
    backgroundColor: '#2f9b57',
  },
  rejectedButton: {
    backgroundColor: '#cc3f3f',
  },
  adminActionText: {
    color: '#fff',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
});
