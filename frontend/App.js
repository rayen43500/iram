import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Image, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions, Modal, useWindowDimensions
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, CreditCard, Calculator, MessageCircle, ShieldCheck, Wallet, Banknote, LogOut, RefreshCw, User, Send, ChevronRight, TrendingUp, Clock, CheckCircle2, XCircle, BarChart3, Users, FileText, Search, Filter, Eye, EyeOff, Menu, LayoutDashboard, ClipboardList, CircleUser, X as XIcon, Bell, Fingerprint, Moon, Sun, Camera, Upload, FileDown, QrCode, Globe, Lock, Car, Calendar, DollarSign, Check, ChevronLeft, Percent } from 'lucide-react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import './src/i18n';
import { apiRequest } from './src/api';
import { DARK_COLORS, LIGHT_COLORS, FONTS, RADIUS, SHADOW, SPACING } from './src/theme';
import { StatusBadge, EmptyState, BottomTabBar, KpiCard, SectionCard, SectionTitle, PrimaryButton, SecondaryButton, InputLabel, ChatBubble } from './src/components';

const ATB_LOGO = require('./assets/image.png');

function formatMoney(v) { return `${Number(v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} TND`; }
function formatPercent(v) { const n = Number(v || 0) * (v <= 1 ? 100 : 1); return `${n.toFixed(1)}%`; }

function getCreditIcon(slug, size = 20, color = '#A6192E') {
  const s = String(slug || '').toLowerCase();
  if (s.includes('sayara') || s.includes('start')) return <Car size={size} color={color} />;
  if (s.includes('sakan') || s.includes('renov')) return <Home size={size} color={color} />;
  if (s.includes('mounassib') || s.includes('tahawel')) return <Banknote size={size} color={color} />;
  return <CreditCard size={size} color={color} />;
}

const ADMIN_NAV_BREAKPOINT = 768;
const IDLE_TIMEOUT_MINUTES = 10;
const SECURE_TOKEN_KEY = 'iram.token';
const BIOMETRIC_ENABLED_KEY = 'iram.biometricEnabled';
const DARK_MODE_KEY = 'iram.darkMode';
const LANGUAGE_KEY = 'iram.language';

const IS_WEB = Platform.OS === 'web';

async function storageGetItem(key) {
  if (IS_WEB) {
    try {
      return globalThis?.localStorage?.getItem(key) ?? null;
    } catch (e) {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function storageSetItem(key, value) {
  if (IS_WEB) {
    try {
      globalThis?.localStorage?.setItem(key, value);
    } catch (e) {
      return;
    }
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

async function storageDeleteItem(key) {
  if (IS_WEB) {
    try {
      globalThis?.localStorage?.removeItem(key);
    } catch (e) {
      return;
    }
    return;
  }
  return SecureStore.deleteItemAsync(key);
}
const ADMIN_NAV = [
  { key: 'overview', label: 'Synthèse', icon: LayoutDashboard },
  { key: 'requests', label: 'Demandes', icon: ClipboardList },
  { key: 'products', label: 'Offres crédit', icon: CreditCard },
  { key: 'profile', label: 'Profil', icon: CircleUser },
];

const PRO_CREDIT_CATALOG = [
  { name: 'Crédit Sayara', target: 'Financement véhicule neuf ou d’occasion', speed: '24h' },
  { name: 'Crédit Sakan', target: 'Logement principal ou résidence secondaire', speed: '72h' },
  { name: 'Crédit Mounassib', target: 'Besoin personnel à mensualité équilibrée', speed: '48h' },
  { name: 'Crédit Tahawel', target: 'Transfert et rachat de crédits', speed: '48h' },
  { name: 'Crédit Renov', target: 'Travaux et rénovation de l’habitat', speed: '48h' },
  { name: 'Crédit START', target: 'Lancement ou développement d’activité', speed: '72h' },
  { name: 'Crédit Bien être', target: 'Santé, études et confort familial', speed: '24h' },
];

export default function App() {
  const { width, height } = useWindowDimensions();
  const { t, i18n } = useTranslation();
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const idleTimerRef = useRef(null);
  const splashPulse = useRef(new Animated.Value(0.88)).current;
  const [token, setToken] = useState('');
  const [storedToken, setStoredToken] = useState('');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('fr');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [accountNumber, setAccountNumber] = useState('');
  const [cin, setCin] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('admin@bank.local');
  const [password, setPassword] = useState('Admin@1234');
  const [confirmPasswordAuth, setConfirmPasswordAuth] = useState('');
  const [salary, setSalary] = useState('2500');
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
  const [adminDateFrom, setAdminDateFrom] = useState('');
  const [adminDateTo, setAdminDateTo] = useState('');
  const [adminSelectedRequest, setAdminSelectedRequest] = useState(null);
  const [adminRejectionReason, setAdminRejectionReason] = useState('');
  const [creditSearchQuery, setCreditSearchQuery] = useState('');
  const [creditOnlyActive, setCreditOnlyActive] = useState(false);
  const [creditsSubView, setCreditsSubView] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [creditStartTab, setCreditStartTab] = useState('active');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStatus, setOtpStatus] = useState('');
  const [authOtpCode, setAuthOtpCode] = useState('');
  const [authOtpStatus, setAuthOtpStatus] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqCity, setReqCity] = useState('');
  const [reqProfession, setReqProfession] = useState('');
  const [reqProjectPurpose, setReqProjectPurpose] = useState('');
  const [reqOtherIncome, setReqOtherIncome] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [reqDeclareAccurate, setReqDeclareAccurate] = useState(false);
  const [adminPage, setAdminPage] = useState('overview');
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
  const [profileAvatarDraft, setProfileAvatarDraft] = useState(null);
  const [profileAvatarUrlInput, setProfileAvatarUrlInput] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileProfession, setProfileProfession] = useState('');
  const [savedSimulations, setSavedSimulations] = useState([]);
  const [compareLeftId, setCompareLeftId] = useState('');
  const [compareRightId, setCompareRightId] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loginHistory, setLoginHistory] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [docType, setDocType] = useState('cin');
  const [docDraft, setDocDraft] = useState(null);

  const themeColors = useMemo(() => (darkMode ? DARK_COLORS : LIGHT_COLORS), [darkMode]);
  const COLORS = themeColors;
  const s = useMemo(() => createStyles(COLORS), [COLORS]);
  const themed = useMemo(() => ({ colors: COLORS }), [COLORS]);

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'admin';
  const isCompact = width < 380;
  const isTiny = width < 340;
  const selectedType = useMemo(() => creditTypes.find((i) => String(i.id) === String(selectedCreditTypeId)), [creditTypes, selectedCreditTypeId]);
  const filteredCreditTypes = useMemo(() => creditTypes.filter((t) => {
    const matchQuery = String(t.name || '').toLowerCase().includes(creditSearchQuery.trim().toLowerCase());
    const matchState = !creditOnlyActive || Boolean(t.isActive);
    return matchQuery && matchState;
  }), [creditOnlyActive, creditSearchQuery, creditTypes]);
  const topRecommendedTypes = useMemo(() => [...creditTypes]
    .filter((t) => t.isActive)
    .sort((a, b) => Number(a.annualRate) - Number(b.annualRate))
    .slice(0, 3), [creditTypes]);

  async function initAppSettings() {
    try {
      const [savedToken, storedBio, storedDark, storedLang] = await Promise.all([
        storageGetItem(SECURE_TOKEN_KEY),
        storageGetItem(BIOMETRIC_ENABLED_KEY),
        storageGetItem(DARK_MODE_KEY),
        storageGetItem(LANGUAGE_KEY),
      ]);

      if (savedToken) setStoredToken(savedToken);
      if (storedBio) setBiometricEnabled(storedBio === 'true');
      if (storedDark) setDarkMode(storedDark === 'true');
      if (storedLang) {
        setLanguage(storedLang);
        i18n.changeLanguage(storedLang);
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(Boolean(hasHardware && enrolled));

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    } catch (e) {
      setError(e.message || 'Erreur d’init paramètres.');
    }
  }

  function resetIdleTimer() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (!isAuthenticated) return;
    idleTimerRef.current = setTimeout(() => {
      onLogout();
      setNotice('Déconnexion automatique pour inactivité.');
    }, IDLE_TIMEOUT_MINUTES * 60 * 1000);
  }

  useEffect(() => { initAppSettings(); }, []);

  useEffect(() => {
    if (fontsLoaded) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(splashPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(splashPulse, { toValue: 0.88, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fontsLoaded, splashPulse]);

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
      resetIdleTimer();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    storageSetItem(DARK_MODE_KEY, darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
      storageSetItem(LANGUAGE_KEY, language);
    }
  }, [language]);

  useEffect(() => {
    storageSetItem(BIOMETRIC_ENABLED_KEY, biometricEnabled ? 'true' : 'false');
  }, [biometricEnabled]);

  useEffect(() => {
    if (user?.fullName != null) setProfileEditName(String(user.fullName));
  }, [user?.fullName, user?.id]);

  useEffect(() => {
    setProfileAvatarUrlInput(typeof user?.avatarUrl === 'string' ? user.avatarUrl : '');
  }, [user?.id, user?.avatarUrl]);

  useEffect(() => {
    setProfilePhone(typeof user?.phone === 'string' ? user.phone : '');
    setProfileCity(typeof user?.city === 'string' ? user.city : '');
    setProfileProfession(typeof user?.profession === 'string' ? user.profession : '');
  }, [user?.id, user?.phone, user?.city, user?.profession]);

  async function loadInitialData(authToken = token) {
    try {
      setError(''); setNotice(''); setIsLoadingData(true);
      const [me, dashData, types, sims, notifs, history, docs] = await Promise.all([
        apiRequest('/auth/me', {}, authToken),
        apiRequest('/credits/dashboard', {}, authToken),
        apiRequest('/credits/types', {}, authToken),
        apiRequest('/simulations', {}, authToken),
        apiRequest('/notifications', {}, authToken),
        apiRequest('/auth/login-history', {}, authToken),
        apiRequest('/documents', {}, authToken),
      ]);
      setUser(me); setDashboard(dashData); setCreditTypes(types);
      setSavedSimulations(sims || []);
      setNotifications(notifs || []);
      setUnreadCount((notifs || []).filter((n) => !n.isRead).length);
      setLoginHistory(history || []);
      setDocuments(docs || []);
      if (types.length > 0) setSelectedCreditTypeId((c) => c || String(types[0].id));
      if (me.role === 'admin') {
        const summary = await apiRequest('/admin/analytics/summary', {}, authToken);
        setAdminSummary(summary);
        await loadAdminRequests(authToken);
      }
      return me;
    } catch (e) { setError(e.message || 'Erreur de chargement.'); }
    finally { setIsLoadingData(false); }
    return null;
  }

  async function refreshNotifications(authToken = token) {
    if (!authToken) return;
    try {
      const notifs = await apiRequest('/notifications', {}, authToken);
      setNotifications(notifs || []);
      setUnreadCount((notifs || []).filter((n) => !n.isRead).length);
    } catch (e) {
      setError(e.message || 'Chargement notifications impossible.');
    }
  }

  async function loadAdminRequests(authToken = token) {
    if (!authToken) return;
    try {
      const params = new URLSearchParams();
      if (adminStatusFilter !== 'all') params.set('status', adminStatusFilter);
      if (adminSearchQuery.trim()) params.set('q', adminSearchQuery.trim());
      if (adminDateFrom.trim()) params.set('from', adminDateFrom.trim());
      if (adminDateTo.trim()) params.set('to', adminDateTo.trim());
      const qs = params.toString();
      const reqs = await apiRequest(`/admin/requests${qs ? `?${qs}` : ''}`, {}, authToken);
      setAdminRequests(reqs);
    } catch (e) {
      setError(e.message || 'Chargement demandes admin impossible.');
    }
  }

  async function saveSessionToken(tokenValue) {
    setToken(tokenValue);
    setStoredToken(tokenValue);
    await storageSetItem(SECURE_TOKEN_KEY, tokenValue);
  }

  async function registerForPushNotifications(tokenValue) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return null;

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.expoConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      const expoPushToken = tokenData?.data;
      if (!expoPushToken) return null;

      await apiRequest('/notifications/push-token', {
        method: 'POST',
        body: JSON.stringify({ expoPushToken, platform: Platform.OS, deviceName: Constants?.deviceName || Platform.OS }),
      }, tokenValue || token);

      return expoPushToken;
    } catch (e) {
      return null;
    }
  }

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      refreshNotifications();
    });
    return () => sub.remove();
  }, [token]);

  async function attemptBiometricLogin() {
    if (!storedToken) {
      setError('Aucune session locale disponible.');
      return;
    }
    if (!biometricAvailable) {
      setError('Biometrie indisponible sur cet appareil.');
      return;
    }
    try {
      setBiometricBusy(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentification requise',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
      });
      if (!result.success) {
        setError('Authentification biométrique annulée.');
        return;
      }
      await saveSessionToken(storedToken);
      const me = await loadInitialData(storedToken);
      if (me) {
        setView(me.role === 'admin' ? 'admin' : 'dashboard');
      }
      setNotice('Connexion biométrique réussie.');
      resetIdleTimer();
    } catch (e) {
      setError(e.message || 'Biométrie indisponible.');
    } finally {
      setBiometricBusy(false);
    }
  }

  async function onRegister() {
    const accountNo = accountNumber.trim();
    const cinValue = cin.trim();
    const last = lastName.trim();
    const first = firstName.trim();
    const e = email.trim().toLowerCase();
    if (!accountNo || !cinValue || !last || !first || !e || !password || !confirmPasswordAuth) {
      setError('Numero de compte, CIN, nom, prenom, email, mot de passe et confirmation obligatoires.');
      return;
    }
    if (password !== confirmPasswordAuth) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    try {
      setError(''); setNotice(''); setIsAuthBusy(true);
      const r = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          accountNumber: accountNo,
          cin: cinValue,
          lastName: last,
          firstName: first,
          email: e,
          password,
          confirmPassword: confirmPasswordAuth,
        }),
      });
      await saveSessionToken(r.token);
      setUser(r.user); setView(r.user.role === 'admin' ? 'admin' : 'dashboard'); setNotice('Compte créé avec succès !');
      await registerForPushNotifications(r.token);
      resetIdleTimer();
    } catch (err) { setError(err.message || 'Inscription impossible.'); } finally { setIsAuthBusy(false); }
  }

  async function onLogin() {
    const e = email.trim().toLowerCase();
    if (!e || !password) { setError('Email et mot de passe obligatoires.'); return; }
    try {
      setError(''); setNotice(''); setIsAuthBusy(true);
      const r = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: e, password, deviceName: Constants?.deviceName || Platform.OS }) });
      await saveSessionToken(r.token);
      setUser(r.user); setView(r.user.role === 'admin' ? 'admin' : 'dashboard');
      if (!r.user?.emailVerified) {
        setNotice('Email non verifie. Veuillez le verifier pour activer toutes les fonctions.');
      } else {
        setNotice(biometricAvailable ? 'Connexion réussie ! Activez la biométrie dans Profil → Sécurité.' : 'Connexion réussie !');
      }
      await registerForPushNotifications(r.token);
      resetIdleTimer();
    } catch (err) { setError(err.message || 'Connexion impossible.'); } finally { setIsAuthBusy(false); }
  }

  function onLogout() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setToken(''); setUser(null); setView('dashboard'); setDashboard(null); setCreditTypes([]);
    setSelectedCreditTypeId(''); setEstimationResult(null); setChatMessages([]); setAdminSummary(null); setAdminRequests([]); setNotice(''); setError('');
    setCreditsSubView('categories'); setSelectedCategory(null); setSelectedCredit(null); setCreditStartTab('active');
    setReqPhone(''); setReqCity(''); setReqProfession(''); setReqProjectPurpose('');
    setReqOtherIncome(''); setReqNotes(''); setReqDeclareAccurate(false);
    setAdminPage('overview'); setAdminSidebarOpen(false); setProfileAvatarDraft(null); setProfileAvatarUrlInput('');
    setStoredToken(''); setSavedSimulations([]); setNotifications([]); setUnreadCount(0); setLoginHistory([]); setDocuments([]);
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setConfirmPasswordAuth(''); setOtpCode(''); setOtpStatus(''); setAuthOtpCode(''); setAuthOtpStatus('');
    setDocDraft(null); setCompareLeftId(''); setCompareRightId(''); setShowSchedule(false);
    storageDeleteItem(SECURE_TOKEN_KEY);
  }

  function pickProfileAvatarFromWebFile() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 450000) {
        setError('Image trop volumineuse pour l’API (réduisez la taille ou utilisez une URL https).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result;
        if (typeof r === 'string') setProfileAvatarDraft(r);
      };
      reader.onerror = () => setError('Lecture du fichier impossible.');
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function onSaveProfile() {
    const name = profileEditName.trim();
    if (name.length < 2) { setError('Nom invalide.'); return; }
    const url = profileAvatarUrlInput.trim();
    const urlOk = url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'));
    if (url && !urlOk) {
      setError('URL de photo invalide (utilisez https://… ou une image en data:image/…).');
      return;
    }
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      const body = { fullName: name, phone: profilePhone.trim(), city: profileCity.trim(), profession: profileProfession.trim() };
      if (profileAvatarDraft) body.avatarUrl = profileAvatarDraft;
      else if (urlOk) body.avatarUrl = url;
      const updated = await apiRequest('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }, token);
      setUser((prev) => ({ ...prev, ...updated }));
      setProfileAvatarDraft(null);
      setProfileAvatarUrlInput(typeof updated.avatarUrl === 'string' ? updated.avatarUrl : '');
      setNotice('Profil mis à jour.');
    } catch (e) {
      setError(e.message || 'Mise à jour impossible.');
    } finally {
      setIsActionBusy(false);
    }
  }

  async function onRequestOtp() {
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      const res = await apiRequest('/auth/request-otp', { method: 'POST' }, token);
      setOtpStatus(res.message || 'OTP envoyé.');
      setNotice('Code OTP envoyé par email.');
    } catch (e) {
      setError(e.message || 'Envoi OTP impossible.');
    } finally {
      setIsActionBusy(false);
    }
  }

  async function onVerifyOtp() {
    if (!otpCode.trim()) { setError('Saisissez le code OTP.'); return; }
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      const res = await apiRequest('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ code: otpCode.trim() }) }, token);
      setUser((prev) => ({ ...prev, emailVerified: true }));
      setOtpStatus(res.message || 'Email verifié.');
      setNotice('Email vérifié avec succès.');
    } catch (e) {
      setError(e.message || 'Vérification OTP impossible.');
    } finally {
      setIsActionBusy(false);
    }
  }

  async function onChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Tous les champs mot de passe sont requis.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas.');
      return;
    }
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }, token);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setNotice('Mot de passe mis à jour.');
    } catch (e) {
      setError(e.message || 'Changement de mot de passe impossible.');
    } finally {
      setIsActionBusy(false);
    }
  }

  async function onToggleBiometric() {
    if (!biometricAvailable) {
      setError('Biométrie non disponible sur cet appareil.');
      return;
    }
    if (biometricEnabled) {
      setBiometricEnabled(false);
      setNotice('Biométrie désactivée.');
      return;
    }
    try {
      setBiometricBusy(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Activer la biométrie',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
      });
      if (!result.success) {
        setError('Activation biométrique annulée.');
        return;
      }
      setBiometricEnabled(true);
      setNotice('Biométrie activée.');
    } catch (e) {
      setError(e.message || 'Activation biométrique impossible.');
    } finally {
      setBiometricBusy(false);
    }
  }

  async function onPickProfileAvatar() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Permission photo refusée.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ['images'] });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) { setError('Image invalide.'); return; }
      const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
      setProfileAvatarDraft(dataUrl);
    } catch (e) {
      setError(e.message || 'Import image impossible.');
    }
  }

  async function onPickDocument() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Permission photo refusée.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ['images'] });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) { setError('Document invalide.'); return; }
      const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
      setDocDraft({ dataUrl, fileName: asset.fileName || `document-${Date.now()}.jpg`, mimeType: asset.mimeType || 'image/jpeg' });
    } catch (e) {
      setError(e.message || 'Import document impossible.');
    }
  }

  async function onUploadDocument() {
    if (!docDraft) { setError('Ajoutez un document.'); return; }
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      const created = await apiRequest('/documents', {
        method: 'POST',
        body: JSON.stringify({ type: docType, fileName: docDraft.fileName, mimeType: docDraft.mimeType, dataUrl: docDraft.dataUrl }),
      }, token);
      setDocuments((prev) => [created, ...prev]);
      setDocDraft(null);
      setNotice('Document uploadé.');
    } catch (e) {
      setError(e.message || 'Upload impossible.');
    } finally {
      setIsActionBusy(false);
    }
  }

  async function onDeleteDocument(id) {
    try {
      setError(''); setIsActionBusy(true);
      await apiRequest(`/documents/${id}`, { method: 'DELETE' }, token);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e.message || 'Suppression impossible.');
    } finally {
      setIsActionBusy(false);
    }
  }

  async function onSaveSimulation() {
    if (!estimationResult || !selectedType) {
      setError('Effectuez une estimation d’abord.');
      return;
    }
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      const saved = await apiRequest('/simulations', {
        method: 'POST',
        body: JSON.stringify({
          creditTypeId: selectedType.id,
          label: `Simulation ${selectedType.name}`,
          amount: Number(amount),
          durationMonths: Number(durationMonths),
          annualRate: Number(selectedType.annualRate),
          monthlyPayment: estimationResult.estimation.monthlyPayment,
          totalCost: estimationResult.estimation.totalCost,
          debtRatio: estimationResult.estimation.debtRatio,
          acceptanceProbability: estimationResult.estimation.acceptanceProbability,
        }),
      }, token);
      setSavedSimulations((prev) => [saved, ...prev]);
      setNotice('Simulation sauvegardée.');
    } catch (e) {
      setError(e.message || 'Sauvegarde impossible.');
    } finally {
      setIsActionBusy(false);
    }
  }

  async function onDeleteSimulation(id) {
    try {
      setIsActionBusy(true);
      await apiRequest(`/simulations/${id}`, { method: 'DELETE' }, token);
      setSavedSimulations((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e.message || 'Suppression simulation impossible.');
    } finally {
      setIsActionBusy(false);
    }
  }

  async function onMarkNotificationRead(id) {
    try {
      const updated = await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }, token);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      setError(e.message || 'Maj notification impossible.');
    }
  }

  async function onMarkAllNotificationsRead() {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' }, token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      setError(e.message || 'Maj notifications impossible.');
    }
  }

  async function buildSimulationPdf() {
    if (!estimationResult || !selectedType) return null;
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const { height: pageHeight } = page.getSize();
    let y = pageHeight - 60;
    const draw = (text) => { page.drawText(text, { x: 48, y, size: 12, font }); y -= 18; };
    draw('Simulation de credit');
    draw(`Type: ${selectedType.name}`);
    draw(`Montant: ${formatMoney(amount)}`);
    draw(`Duree: ${durationMonths} mois`);
    draw(`Mensualite: ${formatMoney(estimationResult.estimation.monthlyPayment)}`);
    draw(`Cout total: ${formatMoney(estimationResult.estimation.totalCost)}`);
    draw(`Probabilite: ${formatPercent(estimationResult.estimation.acceptanceProbability)}`);
    const base64 = await pdf.saveAsBase64({ dataUri: false });
    return base64;
  }

  async function sharePdfBase64(base64, filenamePrefix) {
    const shareOk = await Sharing.isAvailableAsync();
    if (!shareOk) {
      setError('Partage indisponible sur cet appareil.');
      return;
    }
    const fileUri = `${FileSystem.cacheDirectory}${filenamePrefix}-${Date.now()}.pdf`;
    const encoding = FileSystem.EncodingType?.Base64 ?? 'base64';
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding });
    await Sharing.shareAsync(fileUri);
  }

  async function onExportSimulationPdf() {
    try {
      const base64 = await buildSimulationPdf();
      if (!base64) return;
      await sharePdfBase64(base64, 'simulation');
      setNotice('PDF simulation exporté.');
    } catch (e) {
      setError(e.message || 'Export PDF impossible.');
    }
  }

  async function onExportRequestsPdf() {
    if (!requests.length) {
      setError('Aucune demande à exporter.');
      return;
    }
    try {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595, 842]);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      let y = 800;
      const draw = (text) => {
        if (y < 48) return;
        page.drawText(String(text).slice(0, 90), { x: 48, y, size: 11, font });
        y -= 16;
      };
      draw('Historique des demandes de credit');
      draw(`Client: ${user?.fullName || ''}`);
      draw(`Email: ${user?.email || ''}`);
      requests.slice(0, 25).forEach((r, i) => {
        draw(`${i + 1}. ${r.CreditType?.name || 'Credit'} — ${r.status} — ${formatMoney(r.requestedAmount)} / ${r.requestedDurationMonths} mois`);
      });
      const base64 = await pdf.saveAsBase64({ dataUri: false });
      await sharePdfBase64(base64, 'demandes');
      setNotice('PDF historique exporté.');
    } catch (e) {
      setError(e.message || 'Export PDF impossible.');
    }
  }

  async function shareNamedPdfBase64(base64, filename) {
    if (Platform.OS === 'web') {
      try {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = filename;
        link.click();
        return;
      } catch (err) {
        setError('Téléchargement du PDF échoué sur le navigateur.');
        return;
      }
    }
    const shareOk = await Sharing.isAvailableAsync();
    if (!shareOk) {
      setError('Partage indisponible sur cet appareil.');
      return;
    }
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    const encoding = FileSystem.EncodingType?.Base64 ?? 'base64';
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding });
    await Sharing.shareAsync(fileUri);
  }

  async function buildApplicationFormPdf(creditName) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const fontBold = await pdf.embedFont(StandardFonts.Helvetica_Bold);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const { height: pageHeight, width: pageWidth } = page.getSize();
    
    let y = pageHeight - 50;
    
    page.drawRectangle({
      x: 40,
      y: y - 50,
      width: pageWidth - 80,
      height: 60,
      color: { r: 166/255, g: 25/255, b: 46/255 },
    });
    
    page.drawText('ARAB TUNISIAN BANK - ATB', {
      x: 60,
      y: y - 25,
      size: 16,
      font: fontBold,
      color: { r: 1, g: 1, b: 1 },
    });
    
    page.drawText('DEMANDE DE CRÉDIT AUX PARTICULIERS', {
      x: 60,
      y: y - 42,
      size: 10,
      font: font,
      color: { r: 1, g: 1, b: 1 },
    });
    
    y -= 80;
    
    page.drawText(`Formulaire de Demande : ${creditName}`, {
      x: 40,
      y,
      size: 14,
      font: fontBold,
      color: { r: 0.1, g: 0.1, b: 0.1 },
    });
    
    y -= 30;
    
    page.drawText('INFORMATIONS DU DEMANDEUR', { x: 40, y, size: 11, font: fontBold });
    y -= 15;
    page.drawText(`Nom et Prénom : ${user?.fullName || 'Client'}`, { x: 50, y, size: 10, font });
    y -= 15;
    page.drawText(`Email : ${user?.email || ''}`, { x: 50, y, size: 10, font });
    y -= 15;
    page.drawText(`Téléphone : ${user?.phone || reqPhone || '—'}`, { x: 50, y, size: 10, font });
    y -= 15;
    page.drawText(`Ville / Adresse : ${user?.city || reqCity || '—'}`, { x: 50, y, size: 10, font });
    y -= 15;
    page.drawText(`Profession : ${user?.profession || reqProfession || '—'}`, { x: 50, y, size: 10, font });
    y -= 15;
    page.drawText(`Revenu mensuel : ${formatMoney(user?.salary || salary)}`, { x: 50, y, size: 10, font });
    
    y -= 30;
    
    page.drawText('CARACTÉRISTIQUES DE LA DEMANDE', { x: 40, y, size: 11, font: fontBold });
    y -= 15;
    page.drawText(`Type de Crédit sélectionné : ${creditName}`, { x: 50, y, size: 10, font });
    
    if (creditName === 'Crédit SAYARA') {
      y -= 15;
      page.drawText(`Montant : Sans plafond`, { x: 50, y, size: 10, font });
      y -= 15;
      page.drawText(`Financement : Jusqu'à 80% du prix du véhicule`, { x: 50, y, size: 10, font });
      y -= 15;
      page.drawText(`Durée de remboursement : Jusqu'à 7 ans`, { x: 50, y, size: 10, font });
    } else if (creditName.includes('START')) {
      y -= 15;
      page.drawText(`Montant : Jusqu'à 2000 DT`, { x: 50, y, size: 10, font });
      y -= 15;
      page.drawText(`Durée de remboursement : Jusqu'à 36 mois`, { x: 50, y, size: 10, font });
    }
    
    y -= 30;
    
    page.drawText('DOCUMENTS À FOURNIR', { x: 40, y, size: 11, font: fontBold });
    y -= 15;
    
    const docsList = creditName === 'Crédit SAYARA' ? [
      "- Pièce d'identité valide (CIN)",
      "- Fiche de paie récente ou justificatif de revenu",
      "- 3 dernières fiches de paie pour les salariés",
      "- Déclaration Unique de Revenus (DUR) pour les non salariés",
      "- 6 derniers relevés de l'ancien compte (nouveaux clients)",
      "- Promesse de vente établie + copie carte grise (pour véhicule d'occasion)",
      "- Facture pro forma (pour véhicule acheté auprès d'un concessionnaire)",
      "- Demande de crédit ATB signée"
    ] : [
      "- Copie CIN",
      "- Demande de crédit ATB",
      "- 3 dernières fiches de paie ou DUR (caution ou client)",
      "- Copie engagement avec l'Auto-école",
      "- Justificatif d'adresse (STEG, SONEDE, Téléphone)",
      "- Attestation de travail et attestation de salaire",
      "- Caution solidaire (si bénéficiaire non actif)"
    ];
    
    for (const docLine of docsList) {
      page.drawText(docLine, { x: 50, y, size: 9, font });
      y -= 14;
    }
    
    y -= 25;
    
    page.drawText('Signature du Client', { x: 80, y, size: 10, font: fontBold });
    page.drawText('Visa de la Banque', { x: pageWidth - 180, y, size: 10, font: fontBold });
    
    y -= 45;
    page.drawText('________________________', { x: 60, y, size: 10, font });
    page.drawText('________________________', { x: pageWidth - 200, y, size: 10, font });
    
    const base64 = await pdf.saveAsBase64({ dataUri: false });
    return base64;
  }

  async function onDownloadDemandeCredit(creditName) {
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      const base64 = await buildApplicationFormPdf(creditName);
      if (!base64) return;
      await shareNamedPdfBase64(base64, 'Demande-de-credit-aux-particuliers.pdf');
      setNotice('Demande de crédit exportée.');
    } catch (e) {
      setError(e.message || 'Export impossible.');
    } finally {
      setIsActionBusy(false);
    }
  }

  function notificationTypeLabel(type) {
    const key = `notifications.types.${type || 'system'}`;
    const label = t(key);
    return label === key ? type || 'Info' : label;
  }

  function requestProgress(status) {
    if (status === 'pending') return 0.5;
    if (status === 'accepted') return 1;
    if (status === 'rejected') return 1;
    return 0.2;
  }

  function validateCreditApplicationForm() {
    const phoneDigits = reqPhone.replace(/\D/g, '');
    if (phoneDigits.length < 8) return 'Téléphone : au moins 8 chiffres.';
    if (reqCity.trim().length < 2) return 'Ville ou adresse (minimum 2 caractères).';
    if (reqProfession.trim().length < 2) return 'Profession / situation.';
    if (reqProjectPurpose.trim().length < 15) return "Objet du financement ou projet (minimum 15 caractères).";
    if (!reqDeclareAccurate) return "Merci de confirmer la véracité des informations.";
    const extra = Number(String(reqOtherIncome).replace(',', '.'));
    if (!Number.isFinite(extra) || extra < 0) return "Revenus complémentaires invalides.";
    return '';
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
      const monthlyOtherIncome = Number(String(reqOtherIncome).replace(',', '.')) || 0;
      const r = await apiRequest('/estimation', {
        method: 'POST',
        body: JSON.stringify({
          creditTypeId: Number(selectedCreditTypeId),
          amount: Number(amount),
          durationMonths: Number(durationMonths),
          salary: sal,
          monthlyOtherIncome,
        }),
      }, token);
      setEstimationResult(r); setShowSchedule(false); setNotice('Estimation calculée !');
    } catch (e) { setError(e.message || 'Estimation impossible.'); } finally { setIsActionBusy(false); }
  }

  async function onSubmitRequest() {
    const ve = validateSim(); if (ve) { setError(ve); return; }
    if (!estimationResult) { setError('Calculez d’abord l’estimation, puis complétez le formulaire.'); return; }
    const fv = validateCreditApplicationForm(); if (fv) { setError(fv); return; }
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      const monthlyOtherIncome = Number(String(reqOtherIncome).replace(',', '.')) || 0;
      await apiRequest('/requests', {
        method: 'POST',
        body: JSON.stringify({
          creditTypeId: Number(selectedCreditTypeId),
          requestedAmount: Number(amount),
          requestedDurationMonths: Number(durationMonths),
          applicationForm: {
            phone: reqPhone.trim().replace(/\s/g, ''),
            city: reqCity.trim(),
            profession: reqProfession.trim(),
            projectPurpose: reqProjectPurpose.trim(),
            monthlyOtherIncome,
            additionalNotes: reqNotes.trim(),
            acceptsAccuracyDeclaration: Boolean(reqDeclareAccurate),
          },
        }),
      }, token);
      await loadInitialData(); setView('dashboard'); setNotice('Demande soumise avec succès !');
      setReqNotes(''); setReqDeclareAccurate(false);
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
    { key: 'dashboard', label: t('tab.dashboard'), icon: Home },
    { key: 'credits', label: t('tab.credits'), icon: CreditCard },
    { key: 'pro', label: t('tab.pro'), icon: Banknote },
    { key: 'simulation', label: t('tab.simulation'), icon: Calculator },
    { key: 'chatbot', label: t('tab.chatbot'), icon: MessageCircle },
    { key: 'notifications', label: t('tab.notifications'), icon: Bell },
    { key: 'profile', label: t('tab.profile'), icon: CircleUser },
  ];
  const tabsAdmin = [
    { key: 'admin', label: t('tab.admin'), icon: ShieldCheck },
    { key: 'notifications', label: t('tab.notifications'), icon: Bell },
    { key: 'chatbot', label: t('tab.chatbot'), icon: MessageCircle },
  ];

  // ─── SPLASH ───
  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={s.safe}>
          <View style={s.splash}>
            <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={s.splashGrad}>
              <Animated.Image source={ATB_LOGO} style={[s.splashLogo, { transform: [{ scale: splashPulse }] }]} resizeMode="contain" />
              <Text style={s.splashTitle}>ATB</Text>
              <Text style={s.splashSub}>Mobile Banking</Text>
              <ActivityIndicator color={COLORS.white} size="large" style={{ marginTop: 24 }} />
            </LinearGradient>
          </View>
          <StatusBar style="light" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // ─── AUTH ───
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={[s.authWrap, isCompact && { padding: SPACING.lg, gap: SPACING.lg }]} keyboardShouldPersistTaps="handled">
            <View style={s.authHeader}>
              <Image source={ATB_LOGO} style={s.authLogo} resizeMode="contain" />
              <Text style={s.authTitle}>{t('common.appName')}</Text>
              <Text style={s.authSubtitle}>{t('common.appSubtitle')}</Text>
            </View>

            <View style={s.authCard}>
              <View style={s.authToggle}>
                <Pressable style={[s.authToggleBtn, authMode === 'login' && s.authToggleBtnActive]} onPress={() => setAuthMode('login')}>
                  <Text style={[s.authToggleText, authMode === 'login' && s.authToggleTextActive]}>{t('common.login')}</Text>
                </Pressable>
                <Pressable style={[s.authToggleBtn, authMode === 'register' && s.authToggleBtnActive]} onPress={() => setAuthMode('register')}>
                  <Text style={[s.authToggleText, authMode === 'register' && s.authToggleTextActive]}>{t('common.register')}</Text>
                </Pressable>
              </View>

              {authMode === 'register' && (
                <>
                  <TextInput style={s.input} value={accountNumber} onChangeText={setAccountNumber} placeholder={t('auth.accountNumber')} keyboardType="numeric" placeholderTextColor={COLORS.textLight} />
                  <TextInput style={s.input} value={cin} onChangeText={setCin} placeholder={t('auth.cin')} keyboardType="numeric" placeholderTextColor={COLORS.textLight} />
                  <TextInput style={s.input} value={lastName} onChangeText={setLastName} placeholder={t('auth.lastName')} placeholderTextColor={COLORS.textLight} />
                  <TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholder={t('auth.firstName')} placeholderTextColor={COLORS.textLight} />
                </>
              )}
              <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder={t('auth.email')} placeholderTextColor={COLORS.textLight} keyboardType="email-address" />
              <View style={s.passwordField}>
                <TextInput
                  style={s.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  placeholder={t('auth.password')}
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Mot de passe"
                  textContentType="password"
                  autoComplete={passwordVisible ? 'off' : 'password'}
                  importantForAutofill="yes"
                />
                <Pressable
                  style={({ pressed }) => [s.passwordReveal, pressed && { opacity: 0.7 }]}
                  onPress={() => setPasswordVisible((v) => !v)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {passwordVisible ? <EyeOff size={22} color={COLORS.primary} strokeWidth={2} /> : <Eye size={22} color={COLORS.textSecondary} strokeWidth={2} />}
                </Pressable>
              </View>
              {authMode === 'register' && (
                <View style={s.passwordField}>
                  <TextInput
                    style={s.passwordInput}
                    value={confirmPasswordAuth}
                    onChangeText={setConfirmPasswordAuth}
                    secureTextEntry={!confirmPasswordVisible}
                    placeholder={t('auth.confirmPassword')}
                    placeholderTextColor={COLORS.textLight}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Confirmation mot de passe"
                    textContentType="password"
                    autoComplete={confirmPasswordVisible ? 'off' : 'password'}
                    importantForAutofill="yes"
                  />
                  <Pressable
                    style={({ pressed }) => [s.passwordReveal, pressed && { opacity: 0.7 }]}
                    onPress={() => setConfirmPasswordVisible((v) => !v)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={confirmPasswordVisible ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                  >
                    {confirmPasswordVisible ? <EyeOff size={22} color={COLORS.primary} strokeWidth={2} /> : <Eye size={22} color={COLORS.textSecondary} strokeWidth={2} />}
                  </Pressable>
                </View>
              )}

              <PrimaryButton label={authMode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')} onPress={authMode === 'login' ? onLogin : onRegister} disabled={isAuthBusy} loading={isAuthBusy} colors={COLORS} />

              <View style={s.otpRow}>
                <SecondaryButton label={t('auth.sendOtp')} onPress={onRequestAuthOtp} disabled={isAuthBusy} colors={COLORS} />
                <TextInput style={[s.input, s.otpInput]} value={authOtpCode} onChangeText={setAuthOtpCode} placeholder={t('auth.otpPlaceholder')} placeholderTextColor={COLORS.textLight} keyboardType="numeric" />
                <PrimaryButton label={t('auth.verifyEmail')} onPress={onVerifyAuthOtp} disabled={isAuthBusy} colors={COLORS} />
              </View>
              {authOtpStatus ? <Text style={s.formHint}>{authOtpStatus}</Text> : null}

              {storedToken && biometricEnabled ? (
                <SecondaryButton
                  label={biometricBusy ? t('common.loading') : t('common.biometricLogin')}
                  onPress={attemptBiometricLogin}
                  disabled={biometricBusy}
                  colors={COLORS}
                />
              ) : null}

              <Text style={s.helper}>{t('auth.testAccounts')}</Text>
              {notice ? <Text style={s.noticeText}>{notice}</Text> : null}
              {error ? <Text style={s.errorText}>{error}</Text> : null}
            </View>
          </ScrollView>
          <StatusBar style={darkMode ? 'light' : 'dark'} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // ─── MAIN APP ───
  const loans = dashboard?.loans || [];
  const requests = dashboard?.requests || [];
  const debtRatio = Number(estimationResult?.estimation?.debtRatio || 0);
  const riskLevel = debtRatio <= 0.35 ? 'Faible' : debtRatio <= 0.45 ? 'Moyen' : 'Eleve';
  const riskColor = debtRatio <= 0.35 ? COLORS.success : debtRatio <= 0.45 ? COLORS.warning : COLORS.error;
  const scoreWidth = `${Math.max(4, Math.min(100, debtRatio * 100))}%`;

  const filteredAdminRequests = adminRequests;

  const adminNavRail = ADMIN_NAV.map((nav) => {
    const Ico = nav.icon;
    const active = adminPage === nav.key;
    return (
      <TouchableOpacity key={nav.key} style={[s.adminNavBtn, active && s.adminNavBtnActive]} onPress={() => { setAdminPage(nav.key); setAdminSidebarOpen(false); }}>
        <Ico size={18} color={active ? COLORS.white : COLORS.primary} />
        <Text style={[s.adminNavBtnText, active && s.adminNavBtnTextActive]}>{nav.label}</Text>
      </TouchableOpacity>
    );
  });

  const adminRailReserve = isAdmin && view === 'admin' && width >= ADMIN_NAV_BREAKPOINT ? 224 : 0;
  const chartEdgePad = isCompact ? 40 : 56;
  const adminChartWidth = width < 600 ? Math.max(210, width - adminRailReserve - chartEdgePad) : 300;
  const adminGridItemStyle = {
    flexBasis: width < 520 ? '48%' : '31%',
    flexGrow: 1,
    minWidth: 140,
  };

  const trimmedAvatarUrl = profileAvatarUrlInput.trim();
  const avatarUrlPreviewOk = trimmedAvatarUrl && (trimmedAvatarUrl.startsWith('http://') || trimmedAvatarUrl.startsWith('https://') || trimmedAvatarUrl.startsWith('data:image/'));
  const profileAvatarSrc = profileAvatarDraft || (avatarUrlPreviewOk ? trimmedAvatarUrl : null) || user?.avatarUrl || null;
  const showProfileScreen = (!isAdmin && view === 'profile') || (isAdmin && view === 'admin' && adminPage === 'profile');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe} onTouchStart={resetIdleTimer}>
        {/* Header */}
        <View style={[s.header, isCompact && s.headerCompact]}>
        <View style={s.headerLeft}>
          {isAdmin && view === 'admin' && width < ADMIN_NAV_BREAKPOINT ? (
            <TouchableOpacity style={s.headerIconBtn} onPress={() => setAdminSidebarOpen(true)}>
              <Menu size={20} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
          <Image source={ATB_LOGO} style={s.headerLogo} resizeMode="contain" />
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={s.headerUserAvatar} />
          ) : null}
          <View style={{ flexShrink: 1 }}>
            <Text style={s.headerGreet}>Bonjour</Text>
            <Text style={[s.headerName, isTiny && { fontSize: 14 }]} numberOfLines={1}>{user?.fullName}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={() => setView('notifications')} style={s.headerIconBtn}>
            <Bell size={18} color={COLORS.primary} />
            {unreadCount > 0 ? (
              <View style={s.notifyBadge}><Text style={s.notifyBadgeText}>{unreadCount}</Text></View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity onPress={loadInitialData} disabled={isLoadingData} style={s.headerIconBtn}>
            <RefreshCw size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} style={s.headerIconBtn}>
            <LogOut size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.adminLayout}>
        {isAdmin && view === 'admin' && width >= ADMIN_NAV_BREAKPOINT ? (
          <View style={s.adminSidebarRail}>
            <Text style={s.adminSidebarTitle}>Administration</Text>
            {adminNavRail}
          </View>
        ) : null}
        <ScrollView style={s.body} contentContainerStyle={[s.bodyContent, isCompact && { padding: SPACING.md }]} refreshControl={<RefreshControl refreshing={isLoadingData} onRefresh={loadInitialData} tintColor={COLORS.primary} />}>
        {notice ? <View style={s.noticeBanner}><CheckCircle2 size={16} color={COLORS.success} /><Text style={s.noticeText}>{notice}</Text></View> : null}
        {error ? <View style={s.errorBanner}><XCircle size={16} color={COLORS.error} /><Text style={s.errorText}>{error}</Text></View> : null}

        {isLoadingData && <View style={s.loadingBox}><ActivityIndicator color={COLORS.primary} /><Text style={s.loadingText}>Chargement…</Text></View>}

        {/* ── DASHBOARD ── */}
        {view === 'dashboard' && (
          <>
            <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={[s.balanceCard, isTiny && { padding: SPACING.lg }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={s.balanceTop}>
                <Text style={s.balanceLabel}>Solde disponible</Text>
                <Wallet size={22} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={[s.balanceAmount, isCompact && { fontSize: 26 }]}>{formatMoney(dashboard?.client?.balance)}</Text>
              <View style={s.balanceBottom}>
                <Text style={s.balanceSalary}>Salaire : {formatMoney(dashboard?.client?.salary)}</Text>
              </View>
              <View style={s.balanceDecor} />
              <View style={s.balanceDecor2} />
            </LinearGradient>

            <View style={s.kpiRow}>
              <KpiCard icon={CreditCard} label="Crédits" value={loans.length} color={COLORS.secondary} {...themed} />
              <KpiCard icon={Clock} label="Demandes" value={requests.length} color={COLORS.warning} {...themed} />
            </View>
            <View style={[s.kpiRow, { marginTop: 2 }]}>
              <KpiCard icon={Banknote} label="Offres pro" value={PRO_CREDIT_CATALOG.length} color={COLORS.primary} {...themed} />
              <KpiCard icon={TrendingUp} label="Type actif" value={selectedType?.name || '-'} color={COLORS.success} {...themed} />
            </View>

            <View style={s.quickActionRow}>
              <PrimaryButton label="Voir crédits Pro" onPress={() => setView('pro')} {...themed} />
              <SecondaryButton label="Démarrer simulation" onPress={() => setView('simulation')} {...themed} />
            </View>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>Crédits existants</SectionTitle>
              {loans.length === 0 ? <EmptyState icon="💳" title="Aucun crédit actif" description="Lancez une simulation pour démarrer." {...themed} /> : loans.map((l) => (
                <View style={s.listItem} key={l.id}>
                  <View style={s.listItemHead}><Text style={s.listItemTitle}>{l.CreditType?.name || 'Crédit'}</Text><StatusBadge status={l.status} {...themed} /></View>
                  <Text style={s.listItemSub}>Montant : {formatMoney(l.amount)} • {l.durationMonths} mois</Text>
                  <Text style={s.listItemSub}>Mensualité : {formatMoney(l.monthlyPayment)} • Restant : {l.remainingInstallments}</Text>
                </View>
              ))}
            </SectionCard>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>Demandes récentes</SectionTitle>
              {requests.length === 0 ? <EmptyState icon="📋" title="Aucune demande" description="Soumettez votre première demande." {...themed} /> : requests.map((r) => (
                <View style={s.listItem} key={r.id}>
                  <View style={s.listItemHead}><Text style={s.listItemTitle}>{r.CreditType?.name || 'Crédit'}</Text><StatusBadge status={r.status} {...themed} /></View>
                  <Text style={s.listItemSub}>{formatMoney(r.requestedAmount)} sur {r.requestedDurationMonths} mois</Text>
                  <Text style={s.listItemSub}>Probabilité : {formatPercent(r.acceptanceProbability || 0)}</Text>
                  <View style={s.requestProgressTrack}>
                    <View style={[s.requestProgressFill, { width: `${Math.round(requestProgress(r.status) * 100)}%` }]} />
                  </View>
                  {r.applicationForm?.phone ? <Text style={s.formMeta}>Contact dossier : {r.applicationForm.phone}</Text> : null}
                </View>
              ))}
            </SectionCard>
          </>
        )}

        {/* ── CREDITS ── */}
        {view === 'credits' && (
          <>
            {creditsSubView === 'categories' && (
              <>
                <SectionCard {...themed}>
                  <SectionTitle {...themed}>Crédits ATB</SectionTitle>
                  <Text style={s.proLead}>
                    Découvrez nos offres de crédit sur-mesure conçues pour vous accompagner dans tous vos projets de vie.
                  </Text>
                  
                  <View style={{ gap: SPACING.md, marginTop: SPACING.sm }}>
                    {[
                      { name: 'Voitures', icon: Car, label: 'Voitures', desc: 'Crédit auto SAYARA, crédit START Permis...', color: COLORS.primary },
                      { name: 'Immobilier', icon: Home, label: 'Immobilier', desc: 'Logement Sakan, Crédit Rénov...', color: COLORS.secondary },
                      { name: 'Consommation', icon: Banknote, label: 'Consommation', desc: 'Prêt personnel Mounassib, Rachat Tahawel...', color: COLORS.warning },
                      { name: 'Autres crédits', icon: CreditCard, label: 'Autres crédits', desc: 'Crédit Bien-être (Santé, Études...)', color: COLORS.success },
                    ].map((cat) => {
                      const CatIcon = cat.icon;
                      return (
                        <Pressable
                          key={cat.name}
                          style={[s.listItem, { flexDirection: 'row', alignItems: 'center', gap: 14, padding: SPACING.lg }]}
                          onPress={() => {
                            setSelectedCategory(cat.name);
                            setCreditsSubView('category_detail');
                          }}
                        >
                          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: cat.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                            <CatIcon size={22} color={cat.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.listItemTitle, { fontSize: 16 }]}>{cat.label}</Text>
                            <Text style={s.listItemSub}>{cat.desc}</Text>
                          </View>
                          <ChevronRight size={18} color={COLORS.textLight} />
                        </Pressable>
                      );
                    })}
                  </View>
                </SectionCard>

                <SectionCard {...themed}>
                  <SectionTitle {...themed}>Historique complet des demandes</SectionTitle>
                  {requests.length === 0 ? (
                    <EmptyState icon="📋" title="Aucune demande" description="Soumettez une demande depuis Simulation." {...themed} />
                  ) : requests.map((r) => (
                    <View style={s.listItem} key={`hist-${r.id}`}>
                      <View style={s.listItemHead}>
                        <Text style={s.listItemTitle}>{r.CreditType?.name || 'Crédit'}</Text>
                        <StatusBadge status={r.status} {...themed} />
                      </View>
                      <Text style={s.listItemSub}>{formatMoney(r.requestedAmount)} • {r.requestedDurationMonths} mois • {formatPercent(r.acceptanceProbability || 0)}</Text>
                      <View style={s.requestProgressTrack}>
                        <View style={[s.requestProgressFill, { width: `${Math.round(requestProgress(r.status) * 100)}%` }]} />
                      </View>
                      <Text style={s.formHint}>{r.status === 'pending' ? 'En cours d’étude' : r.status === 'accepted' ? 'Dossier accepté' : 'Dossier refusé'}</Text>
                    </View>
                  ))}
                </SectionCard>
              </>
            )}

            {creditsSubView === 'category_detail' && (
              <SectionCard {...themed}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm }}
                  onPress={() => setCreditsSubView('categories')}
                >
                  <ChevronLeft size={16} color={COLORS.primary} />
                  <Text style={{ fontFamily: FONTS.semiBold, color: COLORS.primary, fontSize: 13 }}>Retour aux catégories</Text>
                </TouchableOpacity>

                <SectionTitle {...themed}>Catégorie : {selectedCategory}</SectionTitle>
                
                <View style={s.creditFilters}>
                  <View style={[s.input, s.creditSearchInput]}>
                    <Search size={16} color={COLORS.textLight} />
                    <TextInput
                      style={s.creditSearchText}
                      placeholder="Rechercher un crédit..."
                      placeholderTextColor={COLORS.textLight}
                      value={creditSearchQuery}
                      onChangeText={setCreditSearchQuery}
                    />
                  </View>
                </View>

                {(() => {
                  const filtered = creditTypes.filter((t) => {
                    const matchesCategory = String(t.category || '').toLowerCase() === String(selectedCategory || '').toLowerCase();
                    const matchesQuery = String(t.name || '').toLowerCase().includes(creditSearchQuery.trim().toLowerCase());
                    const matchesActive = !creditOnlyActive || Boolean(t.isActive);
                    return matchesCategory && matchesQuery && matchesActive;
                  });

                  if (filtered.length === 0) {
                    return <EmptyState icon="📂" title="Aucun crédit" description="Aucune offre disponible dans cette catégorie." {...themed} />;
                  }

                  return filtered.map((t) => (
                    <View key={t.id} style={[s.creditType, { gap: 12, padding: SPACING.lg, borderRadius: 16, borderColor: COLORS.border }]}>
                      <View style={[s.listItemHead, { alignItems: 'center' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                            {getCreditIcon(t.slug, 18, COLORS.primary)}
                          </View>
                          <Text style={[s.listItemTitle, { fontSize: 16, flexShrink: 1 }]} numberOfLines={1}>{t.name}</Text>
                        </View>
                        <View style={s.rateTag}><Text style={s.rateTagText}>{t.annualRate}%</Text></View>
                      </View>
                      <Text style={[s.listItemSub, { fontSize: 13, lineHeight: 18 }]} numberOfLines={2}>
                        {t.shortDescription || t.description}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <DollarSign size={14} color={COLORS.textSecondary} />
                          <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: FONTS.medium }}>
                            {t.name === 'Crédit SAYARA' ? 'Sans plafond' : `${formatMoney(t.minAmount)} – ${formatMoney(t.maxAmount)}`}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Calendar size={14} color={COLORS.textSecondary} />
                          <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: FONTS.medium }}>{t.minDurationMonths} – {t.maxDurationMonths} mois</Text>
                        </View>
                      </View>
                      <View style={{ marginTop: 4 }}>
                        <PrimaryButton
                          label="Voir détails"
                          onPress={() => {
                            setSelectedCredit(t);
                            setCreditsSubView('credit_detail');
                          }}
                          {...themed}
                        />
                      </View>
                    </View>
                  ));
                })()}
              </SectionCard>
            )}

            {creditsSubView === 'credit_detail' && selectedCredit && (
              <SectionCard {...themed}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm }}
                  onPress={() => setCreditsSubView('category_detail')}
                >
                  <ChevronLeft size={16} color={COLORS.primary} />
                  <Text style={{ fontFamily: FONTS.semiBold, color: COLORS.primary, fontSize: 13 }}>Retour à la catégorie</Text>
                </TouchableOpacity>

                <SectionTitle {...themed}>{selectedCredit.name}</SectionTitle>
                
                <View style={{ gap: SPACING.md }}>
                  <Text style={[s.listItemSub, { fontSize: 14, lineHeight: 22, color: COLORS.text }]}>
                    {selectedCredit.description}
                  </Text>

                  <View style={{ borderTopWidth: 1, borderColor: COLORS.borderLight, paddingTop: SPACING.md, gap: SPACING.sm }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text, marginBottom: 4 }}>Caractéristiques du crédit :</Text>
                    
                    {/* Montant Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.success + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={15} color={COLORS.success} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.textSecondary }}>Montant</Text>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text }}>
                          {selectedCredit.name === 'Crédit SAYARA' ? 'Sans plafond' : 
                           selectedCredit.name.includes('START') ? 'Jusqu\'à 2000 DT' : 
                           `${formatMoney(selectedCredit.minAmount)} – ${formatMoney(selectedCredit.maxAmount)}`}
                        </Text>
                      </View>
                    </View>

                    {/* Financement Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <Percent size={15} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.textSecondary }}>Pourcentage de financement</Text>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text }}>
                          {selectedCredit.name === 'Crédit SAYARA' ? 'Jusqu\'à 80% du prix de la voiture' : 
                           selectedCredit.name.includes('START') ? 'Financement direct de l\'auto-école' : 
                           'Financement sur-mesure'}
                        </Text>
                      </View>
                    </View>

                    {/* Durée Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.warning + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={15} color={COLORS.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.textSecondary }}>Durée de remboursement</Text>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text }}>
                          {selectedCredit.name === 'Crédit SAYARA' ? 'Jusqu\'à 7 ans (84 mois)' : 
                           selectedCredit.name.includes('START') ? 'Jusqu\'à 36 mois' : 
                           `${selectedCredit.minDurationMonths} – ${selectedCredit.maxDurationMonths} mois`}
                        </Text>
                      </View>
                    </View>

                    {/* Conditions Spécifiques */}
                    <View style={{ marginTop: 6, borderTopWidth: 1, borderColor: COLORS.borderLight, paddingTop: SPACING.md }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text, marginBottom: 6 }}>Conditions & Avantages spécifiques :</Text>
                      {selectedCredit.features && selectedCredit.features.length > 0 ? (
                        selectedCredit.features.map((feature, idx) => (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 }}>
                            <CheckCircle2 size={14} color={COLORS.success} style={{ marginTop: 2 }} />
                            <Text style={{ flex: 1, fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 }}>
                              {feature}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textLight }}>Aucune condition spécifique.</Text>
                      )}
                    </View>
                  </View>

                  <View style={{ gap: SPACING.sm, marginTop: SPACING.sm }}>
                    {selectedCredit.hasDocuments && (
                      <PrimaryButton
                        label="Documents nécessaires pour le crédit"
                        onPress={() => setCreditsSubView('credit_documents')}
                        {...themed}
                      />
                    )}
                    <SecondaryButton
                      label="Simuler ce crédit"
                      onPress={() => {
                        setSelectedCreditTypeId(String(selectedCredit.id));
                        setView('simulation');
                      }}
                      {...themed}
                    />
                  </View>
                </View>
              </SectionCard>
            )}

            {creditsSubView === 'credit_documents' && selectedCredit && (
              <SectionCard {...themed}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm }}
                  onPress={() => setCreditsSubView('credit_detail')}
                >
                  <ChevronLeft size={16} color={COLORS.primary} />
                  <Text style={{ fontFamily: FONTS.semiBold, color: COLORS.primary, fontSize: 13 }}>Retour aux détails</Text>
                </TouchableOpacity>

                <SectionTitle {...themed}>Documents requis : {selectedCredit.name}</SectionTitle>
                <Text style={s.formHint}>Veuillez préparer les pièces justificatives suivantes pour la constitution de votre dossier de crédit.</Text>

                {selectedCredit.name.includes('START') ? (
                  <View style={{ gap: SPACING.md }}>
                    <View style={s.authToggle}>
                      <Pressable
                        style={[s.authToggleBtn, creditStartTab === 'active' && s.authToggleBtnActive]}
                        onPress={() => setCreditStartTab('active')}
                      >
                        <Text style={[s.authToggleText, creditStartTab === 'active' && s.authToggleTextActive]}>Bénéficiaire actif</Text>
                      </Pressable>
                      <Pressable
                        style={[s.authToggleBtn, creditStartTab === 'inactive' && s.authToggleBtnActive]}
                        onPress={() => setCreditStartTab('inactive')}
                      >
                        <Text style={[s.authToggleText, creditStartTab === 'inactive' && s.authToggleTextActive]}>Bénéficiaire non actif</Text>
                      </Pressable>
                    </View>

                    <View style={{ gap: SPACING.sm }}>
                      {(creditStartTab === 'active' ? [
                        "Copie CIN",
                        "Demande de crédit ATB",
                        "3 dernières fiches de paie ou DUR",
                        "Copie engagement avec Auto-école",
                        "Justificatif d'adresse actuelle (STEG, SONEDE, Téléphone)",
                        "Attestation de travail",
                        "Attestation de salaire"
                      ] : [
                        "Copie CIN",
                        "Demande de crédit ATB",
                        "Caution solidaire",
                        "Formulaire informations complémentaires personne physique pour caution",
                        "Copie CIN de la caution",
                        "3 dernières fiches de paie ou DUR de la caution",
                        "Ordre prélèvement",
                        "Domiciliation salaire ou cession salaire",
                        "Ordre de virement si caution client ATB",
                        "Copie engagement Auto-école",
                        "Justificatif adresse client et caution",
                        "Attestation travail caution",
                        "Attestation salaire caution"
                      ]).map((doc, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: COLORS.borderLight }}>
                          <Check size={16} color={COLORS.success} />
                          <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text, flex: 1 }}>{doc}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={{ gap: SPACING.sm, marginTop: SPACING.sm }}>
                      <PrimaryButton
                        label="Télécharger la demande de crédit"
                        onPress={() => onDownloadDemandeCredit(selectedCredit.name)}
                        {...themed}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: SPACING.md }}>
                    <View style={{ gap: SPACING.sm }}>
                      {(selectedCredit.requiredDocuments || []).map((doc, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: COLORS.borderLight }}>
                          <Check size={16} color={COLORS.success} />
                          <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text, flex: 1 }}>{doc}</Text>
                        </View>
                      ))}
                    </View>

                    {selectedCredit.pdfFiles && selectedCredit.pdfFiles.length > 0 && (
                      <View style={{ gap: SPACING.sm, marginTop: SPACING.sm }}>
                        {selectedCredit.pdfFiles.map((pdf, idx) => (
                          <PrimaryButton
                            key={idx}
                            label={`Télécharger : ${pdf.name}`}
                            onPress={() => onDownloadDemandeCredit(selectedCredit.name)}
                            {...themed}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </SectionCard>
            )}
          </>
        )}

        {/* ── PRO CREDITS ── */}
        {view === 'pro' && (
          <>
            <SectionCard {...themed}>
              <SectionTitle {...themed}>Solutions de crédit pro</SectionTitle>
              <Text style={s.proLead}>
                Offres premium avec traitement prioritaire, accompagnement dossier et suivi digital.
              </Text>
              {PRO_CREDIT_CATALOG.map((offer) => (
                <View key={offer.name} style={s.proCard}>
                  <View style={s.listItemHead}>
                    <Text style={s.listItemTitle}>{offer.name}</Text>
                    <View style={s.rateTag}>
                      <Text style={s.rateTagText}>Réponse {offer.speed}</Text>
                    </View>
                  </View>
                  <Text style={s.listItemSub}>{offer.target}</Text>
                </View>
              ))}
            </SectionCard>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>Fonctionnalités Pro</SectionTitle>
              <View style={s.proFeatureItem}>
                <CheckCircle2 size={16} color={COLORS.success} />
                <Text style={s.proFeatureText}>Pré-analyse rapide du dossier en 3 étapes.</Text>
              </View>
              <View style={s.proFeatureItem}>
                <CheckCircle2 size={16} color={COLORS.success} />
                <Text style={s.proFeatureText}>Priorisation automatique des demandes urgentes.</Text>
              </View>
              <View style={s.proFeatureItem}>
                <CheckCircle2 size={16} color={COLORS.success} />
                <Text style={s.proFeatureText}>Orientation instantanée vers la meilleure offre.</Text>
              </View>
              <View style={s.proFeatureItem}>
                <CheckCircle2 size={16} color={COLORS.success} />
                <Text style={s.proFeatureText}>Suivi du statut et assistance dans {"l\u2019application"}.</Text>
              </View>
              <View style={s.quickActionRow}>
                <PrimaryButton label="Lancer une simulation pro" onPress={() => setView('simulation')} {...themed} />
              </View>
            </SectionCard>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>Recommandations intelligentes</SectionTitle>
              {topRecommendedTypes.length === 0 ? (
                <EmptyState icon="✨" title="Aucune offre active" description={"Activez des produits dans l\u2019admin pour voir les recommandations."} {...themed} />
              ) : topRecommendedTypes.map((offer, idx) => (
                <View key={offer.id} style={s.recoCard}>
                  <View style={s.listItemHead}>
                    <Text style={s.listItemTitle}>#{idx + 1} {offer.name}</Text>
                    <Text style={s.recoRate}>{offer.annualRate}%</Text>
                  </View>
                  <Text style={s.listItemSub}>Durée optimale : {offer.minDurationMonths}-{offer.maxDurationMonths} mois</Text>
                  <SecondaryButton label="Utiliser pour simulation" onPress={() => { setSelectedCreditTypeId(String(offer.id)); setView('simulation'); }} {...themed} />
                </View>
              ))}
            </SectionCard>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>Parcours complet</SectionTitle>
              <View style={s.stepItem}>
                <View style={[s.stepDot, { backgroundColor: selectedCreditTypeId ? COLORS.success : COLORS.textLight }]} />
                <Text style={s.stepText}>{"1. Choisir l\u2019offre adaptée"}</Text>
              </View>
              <View style={s.stepItem}>
                <View style={[s.stepDot, { backgroundColor: amount && durationMonths ? COLORS.success : COLORS.textLight }]} />
                <Text style={s.stepText}>2. Simuler montant et durée</Text>
              </View>
              <View style={s.stepItem}>
                <View style={[s.stepDot, { backgroundColor: estimationResult ? COLORS.success : COLORS.textLight }]} />
                <Text style={s.stepText}>3. Analyser score et risque</Text>
              </View>
              <View style={s.stepItem}>
                <View style={[s.stepDot, { backgroundColor: requests.length > 0 ? COLORS.success : COLORS.textLight }]} />
                <Text style={s.stepText}>4. Soumettre puis suivre la demande</Text>
              </View>
            </SectionCard>
          </>
        )}

        {/* ── SIMULATION ── */}
        {view === 'simulation' && (
          <SectionCard {...themed}>
            <SectionTitle {...themed}>Simulation de crédit</SectionTitle>
            <View style={s.chipRow}>
              <CreditCard size={16} color={COLORS.primary} />
              <Text style={s.chipText}>Type : {selectedType?.name || 'Aucun sélectionné'}</Text>
            </View>
            <View style={s.presetRow}>
              {[5000, 10000, 20000, 50000].map((presetAmount) => (
                <Pressable key={presetAmount} style={s.presetChip} onPress={() => setAmount(String(presetAmount))}>
                  <Text style={s.presetChipText}>{(presetAmount / 1000).toFixed(0)}k</Text>
                </Pressable>
              ))}
            </View>
            <InputLabel {...themed}>Montant (TND)</InputLabel>
            <TextInput style={s.input} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="Ex: 10000" placeholderTextColor={COLORS.textLight} />
            <View style={s.presetRow}>
              {[12, 24, 36, 60].map((presetDuration) => (
                <Pressable key={presetDuration} style={s.presetChip} onPress={() => setDurationMonths(String(presetDuration))}>
                  <Text style={s.presetChipText}>{presetDuration}m</Text>
                </Pressable>
              ))}
            </View>
            <InputLabel {...themed}>Durée (mois)</InputLabel>
            <TextInput style={s.input} keyboardType="numeric" value={durationMonths} onChangeText={setDurationMonths} placeholder="Ex: 36" placeholderTextColor={COLORS.textLight} />

            <PrimaryButton label={"Calculer l\u2019estimation"} onPress={onEstimate} disabled={isActionBusy} loading={isActionBusy} {...themed} />

            {!estimationResult ? <Text style={s.formMuted}>Après estimation, vous pourrez remplir le formulaire et envoyer la demande.</Text> : null}

            {estimationResult ? (
              <View style={s.resultCard}>
                <Text style={s.resultTitle}>{"Résultat de l\u2019estimation"}</Text>
                <View style={s.resultRow}><Text style={s.resultLabel}>Mensualité</Text><Text style={s.resultValue}>{formatMoney(estimationResult.estimation.monthlyPayment)}</Text></View>
                <View style={s.resultRow}><Text style={s.resultLabel}>Coût total</Text><Text style={s.resultValue}>{formatMoney(estimationResult.estimation.totalCost)}</Text></View>
                <View style={s.resultRow}><Text style={s.resultLabel}>Ratio endettement</Text><Text style={s.resultValue}>{formatPercent(estimationResult.estimation.debtRatio)}</Text></View>
                <View style={s.resultRow}><Text style={s.resultLabel}>Probabilité</Text><Text style={[s.resultValue, { color: COLORS.success }]}>{formatPercent(estimationResult.estimation.acceptanceProbability)}</Text></View>
                <View style={s.scoreWrap}>
                  <View style={s.scoreHead}>
                    <Text style={s.resultLabel}>Niveau de risque</Text>
                    <Text style={[s.scoreLabel, { color: riskColor }]}>{riskLevel}</Text>
                  </View>
                  <View style={s.scoreTrack}>
                    <View style={[s.scoreFill, { width: scoreWidth, backgroundColor: riskColor }]} />
                  </View>
                </View>
              </View>
            ) : null}

            {estimationResult ? (
              <View style={s.simActionRow}>
                <PrimaryButton label="Sauvegarder la simulation" onPress={onSaveSimulation} disabled={isActionBusy} {...themed} />
                <SecondaryButton label="Exporter PDF" onPress={onExportSimulationPdf} disabled={isActionBusy} {...themed} />
              </View>
            ) : null}

            {estimationResult ? (
              <View style={s.amortWrap}>
                <Pressable style={s.amortToggle} onPress={() => setShowSchedule((v) => !v)}>
                  <Text style={s.amortToggleText}>{showSchedule ? 'Masquer' : 'Voir'} le tableau d’amortissement</Text>
                </Pressable>
                {showSchedule ? (
                  <View style={s.amortTable}>
                    {(estimationResult.estimation.amortizationSchedule || []).slice(0, 24).map((row) => (
                      <View style={s.amortRow} key={row.month}>
                        <Text style={s.amortCell}>M{row.month}</Text>
                        <Text style={s.amortCell}>{formatMoney(row.payment)}</Text>
                        <Text style={s.amortCell}>Int: {formatMoney(row.interest)}</Text>
                        <Text style={s.amortCell}>Rest: {formatMoney(row.remaining)}</Text>
                      </View>
                    ))}
                    {(estimationResult.estimation.amortizationSchedule || []).length > 24 ? (
                      <Text style={s.formHint}>Aperçu 24 lignes. Exportez PDF pour le détail complet.</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            <SectionTitle {...themed}>Formulaire de demande</SectionTitle>
            <Text style={s.formHint}>Renseigné pour chaque demande de crédit. Soumission possible après estimation.</Text>
            <InputLabel {...themed}>Téléphone</InputLabel>
            <TextInput style={s.input} value={reqPhone} onChangeText={setReqPhone} placeholder="+216 XX XXX XXX" keyboardType="phone-pad" placeholderTextColor={COLORS.textLight} />
            <InputLabel {...themed}>Ville / adresse</InputLabel>
            <TextInput style={s.input} value={reqCity} onChangeText={setReqCity} placeholder="Ville, rue…" placeholderTextColor={COLORS.textLight} />
            <InputLabel {...themed}>Profession / situation</InputLabel>
            <TextInput style={s.input} value={reqProfession} onChangeText={setReqProfession} placeholder="Employé, rentier, auto-entrepreneur…" placeholderTextColor={COLORS.textLight} />
            <InputLabel {...themed}>Objet du financement (projet)</InputLabel>
            <TextInput
              style={[s.input, s.formTextArea]}
              value={reqProjectPurpose}
              onChangeText={setReqProjectPurpose}
              placeholder={"D\u00e9crivez le projet financ\u00e9 (min. 15 caract\u00e8res)"}
              placeholderTextColor={COLORS.textLight}
              multiline
              textAlignVertical="top"
            />
            <InputLabel {...themed}>Autres revenus mensuels (TND, optionnel)</InputLabel>
            <TextInput style={s.input} value={reqOtherIncome} onChangeText={setReqOtherIncome} placeholder="0" keyboardType="decimal-pad" placeholderTextColor={COLORS.textLight} />
            <InputLabel {...themed}>Remarques complémentaires (optionnel)</InputLabel>
            <TextInput
              style={[s.input, s.formTextArea]}
              value={reqNotes}
              onChangeText={setReqNotes}
              placeholder={"Note pour la banque (optionnel)"}
              placeholderTextColor={COLORS.textLight}
              multiline
              textAlignVertical="top"
            />
            <Pressable style={s.checkboxRow} onPress={() => setReqDeclareAccurate((x) => !x)} accessibilityRole="checkbox" accessibilityState={{ checked: reqDeclareAccurate }}>
              <View style={[s.checkboxBox, reqDeclareAccurate && s.checkboxBoxOn]}>{reqDeclareAccurate ? <CheckCircle2 size={14} color={COLORS.white} /> : null}</View>
              <Text style={s.checkboxLabel}>Je certifie que les informations fournies sont exactes.</Text>
            </Pressable>

            <SecondaryButton label="Soumettre la demande" onPress={onSubmitRequest} disabled={isActionBusy || !estimationResult} {...themed} />
          </SectionCard>
        )}

        {/* ── CHATBOT ── */}
        {view === 'chatbot' && (
          <SectionCard style={{ flex: 1 }} {...themed}>
            <View style={s.chatHeader}><MessageCircle size={20} color={COLORS.primary} /><SectionTitle {...themed}>Assistant ATB</SectionTitle></View>
            <View style={s.chatZone}>
              {chatMessages.length === 0 && <EmptyState icon="🤖" title="Bienvenue !" description="Posez vos questions sur les crédits." {...themed} />}
              {chatMessages.map((m, i) => <ChatBubble key={i} text={m.text} isUser={m.isUser} {...themed} />)}
            </View>
            <View style={s.chatInputRow}>
              <TextInput style={s.chatInput} value={chatQuestion} onChangeText={setChatQuestion} placeholder="Écrivez votre message…" placeholderTextColor={COLORS.textLight} />
              <Pressable style={s.chatSendBtn} onPress={onChat} disabled={isActionBusy}>
                <Send size={18} color={COLORS.white} />
              </Pressable>
            </View>
          </SectionCard>
        )}

        {view === 'notifications' && (
          <SectionCard {...themed}>
            <SectionTitle {...themed}>{t('notifications.title')}</SectionTitle>
            <View style={s.notifyActions}>
              <SecondaryButton label={t('notifications.markAllRead')} onPress={onMarkAllNotificationsRead} {...themed} />
            </View>
            {notifications.length === 0 ? (
              <EmptyState icon="🔔" title={t('notifications.empty')} description="" {...themed} />
            ) : notifications.map((n) => (
              <Pressable key={n.id} style={[s.notifyItem, !n.isRead && s.notifyItemUnread]} onPress={() => onMarkNotificationRead(n.id)}>
                <View style={s.notifyItemHead}>
                  <Text style={s.notifyItemTitle}>{n.title}</Text>
                  {!n.isRead ? <View style={s.notifyDot} /> : null}
                </View>
                <Text style={s.notifyTypeTag}>{notificationTypeLabel(n.type)}</Text>
                <Text style={s.notifyItemText}>{n.message}</Text>
              </Pressable>
            ))}
          </SectionCard>
        )}

        {/* ── ADMIN (pages) ── */}
        {isAdmin && view === 'admin' && adminPage === 'overview' && (
          <SectionCard {...themed}>
            <SectionTitle {...themed}>Vue analytique</SectionTitle>
            {adminSummary ? (
                <>
                  <View style={s.adminGrid}>
                    <View style={adminGridItemStyle}>
                      <KpiCard icon={FileText} label="Total demandes" value={adminSummary.totalRequests} color={COLORS.primary} {...themed} />
                    </View>
                    <View style={adminGridItemStyle}>
                      <KpiCard icon={Clock} label="En attente" value={adminSummary.pendingRequests} color={COLORS.warning} {...themed} />
                    </View>
                    <View style={adminGridItemStyle}>
                      <KpiCard icon={CheckCircle2} label="Acceptées" value={adminSummary.acceptedRequests} color={COLORS.success} {...themed} />
                    </View>
                    <View style={adminGridItemStyle}>
                      <KpiCard icon={XCircle} label="Refusées" value={adminSummary.rejectedRequests} color={COLORS.error} {...themed} />
                    </View>
                    <View style={adminGridItemStyle}>
                      <KpiCard icon={TrendingUp} label="Taux" value={formatPercent(adminSummary.acceptanceRate)} color={COLORS.success} {...themed} />
                    </View>
                    <View style={adminGridItemStyle}>
                      <KpiCard icon={Banknote} label="Montant total" value={formatMoney(adminSummary.totalRequested)} color={COLORS.secondary} {...themed} />
                    </View>
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
                        width={width < 600 ? adminChartWidth : 300}
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
            ) : <EmptyState icon="📊" title="Pas de stats" description="Ajoutez des demandes." {...themed} />}
          </SectionCard>
        )}

        {isAdmin && view === 'admin' && adminPage === 'requests' && (
          <SectionCard {...themed}>
            <SectionTitle {...themed}>Gestion des demandes</SectionTitle>

            <View style={{ marginBottom: 16 }}>
              <View style={[s.input, { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
                <Search size={20} color={COLORS.textLight} />
                <TextInput
                  style={{ flex: 1, marginLeft: 8 }}
                  placeholder="Rechercher par nom..."
                  value={adminSearchQuery}
                  onChangeText={setAdminSearchQuery}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {['all', 'pending', 'accepted', 'rejected'].map((status) => (
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
              <View style={s.rowInputs}>
                <View style={{ flex: 1 }}>
                  <InputLabel {...themed}>Du (AAAA-MM-JJ)</InputLabel>
                  <TextInput style={s.input} value={adminDateFrom} onChangeText={setAdminDateFrom} placeholder="2025-01-01" placeholderTextColor={COLORS.textLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <InputLabel {...themed}>Au (AAAA-MM-JJ)</InputLabel>
                  <TextInput style={s.input} value={adminDateTo} onChangeText={setAdminDateTo} placeholder="2026-12-31" placeholderTextColor={COLORS.textLight} />
                </View>
              </View>
              <PrimaryButton label="Appliquer les filtres" onPress={() => loadAdminRequests()} disabled={isLoadingData} {...themed} />
            </View>

            {filteredAdminRequests.length === 0 ? <EmptyState icon="📋" title="Aucune demande" description="Aucune demande ne correspond aux critères." {...themed} /> : filteredAdminRequests.map((r) => (
              <TouchableOpacity style={s.listItem} key={r.id} onPress={() => setAdminSelectedRequest(r)}>
                <View style={s.listItemHead}><Text style={s.listItemTitle}>{r.User?.fullName || 'Client'}</Text><StatusBadge status={r.status} {...themed} /></View>
                <Text style={s.listItemSub}>{r.CreditType?.name || 'Type'} – {formatMoney(r.requestedAmount)} • {r.requestedDurationMonths} mois</Text>
                <Text style={[s.listItemSub, { marginTop: 4, color: COLORS.primary }]}>Voir les détails {'>'}</Text>
              </TouchableOpacity>
            ))}
          </SectionCard>
        )}

        {isAdmin && view === 'admin' && adminPage === 'products' && (
          <SectionCard {...themed}>
            <SectionTitle {...themed}>Offres de crédit</SectionTitle>
            {creditTypes.map((ct) => (
              <View style={s.listItem} key={ct.id}>
                {editingCreditTypeId === ct.id ? (
                  <View style={{ gap: 8 }}>
                    <Text style={s.listItemTitle}>Édition : {ct.name}</Text>
                    <View style={s.rowInputs}>
                      <View style={{ flex: 1 }}>
                        <InputLabel {...themed}>Taux Annuel (%)</InputLabel>
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
                      <StatusBadge status={ct.isActive ? 'active' : 'En attente'} {...themed} />
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

        {showProfileScreen && (
          <>
            <SectionCard {...themed}>
              <SectionTitle {...themed}>{isAdmin ? t('profile.adminTitle') : t('profile.title')}</SectionTitle>
              <Text style={s.formHint}>
                {isAdmin
                  ? 'Nom affiché dans l’application et photo de profil (optionnel).'
                  : 'Modifiez votre nom et votre photo ; votre email est lié au compte.'}
              </Text>

              <InputLabel {...themed}>Email</InputLabel>
              <Text style={s.profileEmail}>{user?.email || '—'}</Text>
              <View style={s.profileStatusRow}>
                <Text style={s.profileStatusLabel}>{t('profile.emailVerified')}</Text>
                <StatusBadge status={user?.emailVerified ? 'accepted' : 'pending'} {...themed} />
              </View>

              <View style={s.profileAvatarRow}>
                <View style={s.profileAvatarTouch}>
                  {profileAvatarSrc ? (
                    <Image source={{ uri: profileAvatarSrc }} style={s.profileAvatarImg} />
                  ) : (
                    <View style={[s.profileAvatarImg, s.profileAvatarPlaceholder]}>
                      <CircleUser size={40} color={COLORS.textLight} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={[s.formHint, { marginTop: 0 }]}>
                    {Platform.OS === 'web'
                      ? 'Collez une adresse https vers une image, ou importez un fichier (aperçu puis enregistrez).'
                      : 'Importez une photo depuis la galerie ou collez une URL https.'}
                  </Text>
                  {Platform.OS === 'web' ? (
                    <SecondaryButton label="Importer une image (navigateur)" onPress={pickProfileAvatarFromWebFile} {...themed} />
                  ) : (
                    <SecondaryButton label="Importer une image" onPress={onPickProfileAvatar} {...themed} />
                  )}
                </View>
              </View>

              <InputLabel {...themed}>URL de la photo</InputLabel>
              <TextInput
                style={s.input}
                value={profileAvatarUrlInput}
                onChangeText={setProfileAvatarUrlInput}
                placeholder="https://…"
                placeholderTextColor={COLORS.textLight}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <InputLabel {...themed}>Nom affiché</InputLabel>
              <TextInput style={s.input} value={profileEditName} onChangeText={setProfileEditName} placeholder="Nom et prénom" autoCapitalize="words" />

              <InputLabel {...themed}>Téléphone</InputLabel>
              <TextInput style={s.input} value={profilePhone} onChangeText={setProfilePhone} placeholder="+216 XX XXX XXX" keyboardType="phone-pad" placeholderTextColor={COLORS.textLight} />
              <InputLabel {...themed}>Ville</InputLabel>
              <TextInput style={s.input} value={profileCity} onChangeText={setProfileCity} placeholder="Ville" placeholderTextColor={COLORS.textLight} />
              <InputLabel {...themed}>Profession</InputLabel>
              <TextInput style={s.input} value={profileProfession} onChangeText={setProfileProfession} placeholder="Profession" placeholderTextColor={COLORS.textLight} />

              <PrimaryButton label="Enregistrer les modifications" onPress={onSaveProfile} disabled={isActionBusy} loading={isActionBusy} {...themed} />
            </SectionCard>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>Sécurité & authentification</SectionTitle>
              <View style={s.settingRow}>
                <View style={s.settingLeft}><Fingerprint size={18} color={COLORS.primary} /><Text style={s.settingLabel}>{t('settings.biometrics')}</Text></View>
                <Pressable style={[s.toggle, biometricEnabled && s.toggleOn]} onPress={onToggleBiometric}>
                  <View style={[s.toggleKnob, biometricEnabled && s.toggleKnobOn]} />
                </Pressable>
              </View>
              <View style={s.settingRow}>
                <View style={s.settingLeft}><Moon size={18} color={COLORS.primary} /><Text style={s.settingLabel}>{t('settings.darkMode')}</Text></View>
                <Pressable style={[s.toggle, darkMode && s.toggleOn]} onPress={() => setDarkMode((v) => !v)}>
                  <View style={[s.toggleKnob, darkMode && s.toggleKnobOn]} />
                </Pressable>
              </View>
              <View style={s.settingRow}>
                <View style={s.settingLeft}><Globe size={18} color={COLORS.primary} /><Text style={s.settingLabel}>{t('settings.language')}</Text></View>
                <View style={s.langRow}>
                  {['fr', 'en', 'ar'].map((lng) => (
                    <Pressable key={lng} style={[s.langChip, language === lng && s.langChipActive]} onPress={() => setLanguage(lng)}>
                      <Text style={[s.langChipText, language === lng && s.langChipTextActive]}>{lng.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={s.otpRow}>
                <SecondaryButton label={t('profile.sendOtp')} onPress={onRequestOtp} disabled={isActionBusy} {...themed} />
                <TextInput style={[s.input, s.otpInput]} value={otpCode} onChangeText={setOtpCode} placeholder="OTP" placeholderTextColor={COLORS.textLight} keyboardType="numeric" />
                <PrimaryButton label={t('profile.verifyEmail')} onPress={onVerifyOtp} disabled={isActionBusy} {...themed} />
              </View>
              {otpStatus ? <Text style={s.formHint}>{otpStatus}</Text> : null}

              <SectionTitle {...themed}>{t('profile.changePassword')}</SectionTitle>
              <InputLabel {...themed}>Mot de passe actuel</InputLabel>
              <TextInput style={s.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={COLORS.textLight} />
              <InputLabel {...themed}>Nouveau mot de passe</InputLabel>
              <TextInput style={s.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={COLORS.textLight} />
              <InputLabel {...themed}>Confirmation</InputLabel>
              <TextInput style={s.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={COLORS.textLight} />
              <PrimaryButton label="Mettre à jour le mot de passe" onPress={onChangePassword} disabled={isActionBusy} {...themed} />
              <Text style={s.formHint}>{t('common.sessionTimeout', { min: IDLE_TIMEOUT_MINUTES })}</Text>
            </SectionCard>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>{t('profile.documents')}</SectionTitle>
              <View style={s.docRow}>
                {['cin', 'payslip', 'selfie', 'other'].map((type) => (
                  <Pressable key={type} style={[s.langChip, docType === type && s.langChipActive]} onPress={() => setDocType(type)}>
                    <Text style={[s.langChipText, docType === type && s.langChipTextActive]}>{type.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.docActions}>
                <SecondaryButton label="Choisir un document" onPress={onPickDocument} {...themed} />
                <PrimaryButton label="Uploader" onPress={onUploadDocument} disabled={!docDraft} {...themed} />
              </View>
              {documents.length === 0 ? (
                <EmptyState icon="📄" title="Aucun document" description="Ajoutez CIN, fiche de paie ou selfie." {...themed} />
              ) : documents.map((doc) => (
                <View key={doc.id} style={s.listItem}>
                  <View style={s.listItemHead}>
                    <Text style={s.listItemTitle}>{doc.fileName}</Text>
                    <StatusBadge status={doc.status} {...themed} />
                  </View>
                  <Text style={s.listItemSub}>{doc.type.toUpperCase()} • {doc.mimeType}</Text>
                  <SecondaryButton label="Supprimer" onPress={() => onDeleteDocument(doc.id)} {...themed} />
                </View>
              ))}
            </SectionCard>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>Simulations sauvegardées</SectionTitle>
              {savedSimulations.length === 0 ? (
                <EmptyState icon="💾" title="Aucune simulation" description="Sauvegardez une simulation pour comparer." {...themed} />
              ) : savedSimulations.map((sim) => (
                <View key={sim.id} style={s.listItem}>
                  <View style={s.listItemHead}>
                    <Text style={s.listItemTitle}>{sim.label || sim.CreditType?.name || 'Simulation'}</Text>
                    <Text style={s.listItemSub}>{formatMoney(sim.amount)} • {sim.durationMonths} mois</Text>
                  </View>
                  <View style={s.simCompareRow}>
                    <Pressable style={[s.langChip, compareLeftId === String(sim.id) && s.langChipActive]} onPress={() => setCompareLeftId(String(sim.id))}>
                      <Text style={[s.langChipText, compareLeftId === String(sim.id) && s.langChipTextActive]}>A</Text>
                    </Pressable>
                    <Pressable style={[s.langChip, compareRightId === String(sim.id) && s.langChipActive]} onPress={() => setCompareRightId(String(sim.id))}>
                      <Text style={[s.langChipText, compareRightId === String(sim.id) && s.langChipTextActive]}>B</Text>
                    </Pressable>
                    <SecondaryButton label="Supprimer" onPress={() => onDeleteSimulation(sim.id)} {...themed} />
                  </View>
                </View>
              ))}
              {compareLeftId && compareRightId ? (
                <View style={s.compareBox}>
                  {(() => {
                    const left = savedSimulations.find((s) => String(s.id) === String(compareLeftId));
                    const right = savedSimulations.find((s) => String(s.id) === String(compareRightId));
                    if (!left || !right) return null;
                    return (
                      <>
                        <Text style={s.compareTitle}>Comparaison</Text>
                        <Text style={s.listItemSub}>A: {formatMoney(left.amount)} • {left.durationMonths} mois • {formatPercent(left.acceptanceProbability)}</Text>
                        <Text style={s.listItemSub}>B: {formatMoney(right.amount)} • {right.durationMonths} mois • {formatPercent(right.acceptanceProbability)}</Text>
                      </>
                    );
                  })()}
                </View>
              ) : null}
            </SectionCard>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>{t('profile.loginHistory')}</SectionTitle>
              {loginHistory.length === 0 ? (
                <EmptyState icon="🕒" title="Aucune connexion" description="Historique vide." {...themed} />
              ) : loginHistory.slice(0, 8).map((item) => (
                <View key={`${item.id}-${item.loggedAt}`} style={s.listItem}>
                  <Text style={s.listItemTitle}>{item.deviceName || 'Appareil'}</Text>
                  <Text style={s.listItemSub}>{new Date(item.loggedAt).toLocaleString('fr-FR')}</Text>
                </View>
              ))}
            </SectionCard>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>{t('profile.requestHistory')}</SectionTitle>
              {requests.length > 0 ? (
                <SecondaryButton label={t('common.exportPdf')} onPress={onExportRequestsPdf} {...themed} />
              ) : null}
              {requests.length === 0 ? (
                <EmptyState icon="📋" title="Aucune demande" description="Historique vide." {...themed} />
              ) : requests.map((r) => (
                <View key={r.id} style={s.listItem}>
                  <View style={s.listItemHead}><Text style={s.listItemTitle}>{r.CreditType?.name || 'Crédit'}</Text><StatusBadge status={r.status} {...themed} /></View>
                  <Text style={s.listItemSub}>{formatMoney(r.requestedAmount)} • {r.requestedDurationMonths} mois</Text>
                  <View style={s.requestProgressTrack}>
                    <View style={[s.requestProgressFill, { width: `${Math.round(requestProgress(r.status) * 100)}%` }]} />
                  </View>
                </View>
              ))}
            </SectionCard>

            <SectionCard {...themed}>
              <SectionTitle {...themed}>QR Code client</SectionTitle>
              <View style={s.qrWrap}>
                <QRCode value={JSON.stringify({ id: user?.id, email: user?.email })} size={140} backgroundColor="transparent" color={COLORS.text} />
                <Text style={s.formHint}>Montrez ce QR pour accéder rapidement à votre profil.</Text>
              </View>
            </SectionCard>
          </>
        )}
      </ScrollView>
      </View>

      <Modal transparent animationType="fade" visible={isAdmin && view === 'admin' && adminSidebarOpen && width < ADMIN_NAV_BREAKPOINT} onRequestClose={() => setAdminSidebarOpen(false)}>
        <View style={s.adminDrawerRoot}>
          <Pressable style={s.adminDrawerScrim} onPress={() => setAdminSidebarOpen(false)} />
          <View style={[s.adminSidebarRail, s.adminSidebarDrawer]}>
            <View style={s.adminDrawerHeader}>
              <Text style={s.adminSidebarTitle}>Administration</Text>
              <TouchableOpacity hitSlop={12} onPress={() => setAdminSidebarOpen(false)} style={s.headerIconBtn}>
                <XIcon size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {adminNavRail}
          </View>
        </View>
      </Modal>

      {/* ── MODAL DETAIL DOSSIER ── */}
      {adminSelectedRequest && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setAdminSelectedRequest(null)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, isCompact && s.modalContentCompact]}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Détail du Dossier</Text>
                <TouchableOpacity onPress={() => setAdminSelectedRequest(null)}><XCircle size={24} color={COLORS.textLight} /></TouchableOpacity>
              </View>
              <ScrollView style={{ padding: isCompact ? SPACING.md : SPACING.lg, maxHeight: height * 0.7 }}>
                <SectionTitle {...themed}>Informations Client</SectionTitle>
                <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Nom</Text><Text style={s.resultValue}>{adminSelectedRequest.User?.fullName}</Text></View>
                <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Email</Text><Text style={s.resultValue}>{adminSelectedRequest.User?.email}</Text></View>
                <View style={[s.resultRow, { marginBottom: 16 }]}><Text style={s.resultLabel}>Salaire</Text><Text style={s.resultValue}>{formatMoney(adminSelectedRequest.salaryAtRequest || adminSelectedRequest.User?.salary)}</Text></View>

                <SectionTitle {...themed}>Détails du Crédit</SectionTitle>
                <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Type</Text><Text style={s.resultValue}>{adminSelectedRequest.CreditType?.name}</Text></View>
                <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Montant demandé</Text><Text style={s.resultValue}>{formatMoney(adminSelectedRequest.requestedAmount)}</Text></View>
                <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Durée</Text><Text style={s.resultValue}>{adminSelectedRequest.requestedDurationMonths} mois</Text></View>
                <View style={[s.resultRow, { marginBottom: 16 }]}><Text style={s.resultLabel}>Probabilité IA</Text><Text style={s.resultValue}>{formatPercent(adminSelectedRequest.acceptanceProbability)}</Text></View>

                {adminSelectedRequest.applicationForm && typeof adminSelectedRequest.applicationForm === 'object' ? (
                  <>
                    <SectionTitle {...themed}>Formulaire client</SectionTitle>
                    <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Téléphone</Text><Text style={s.resultValue}>{String(adminSelectedRequest.applicationForm.phone || '—')}</Text></View>
                    <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Ville / adresse</Text><Text style={[s.resultValue, { flex: 1.2, textAlign: 'right' }]}>{String(adminSelectedRequest.applicationForm.city || '—')}</Text></View>
                    <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Profession</Text><Text style={[s.resultValue, { flex: 1.2, textAlign: 'right' }]}>{String(adminSelectedRequest.applicationForm.profession || '—')}</Text></View>
                    <View style={[s.resultRow, { marginBottom: 4, alignItems: 'flex-start' }]}><Text style={s.resultLabel}>Projet</Text><Text style={[s.resultValue, { flex: 1, textAlign: 'right', flexWrap: 'wrap' }]}>{String(adminSelectedRequest.applicationForm.projectPurpose || '—')}</Text></View>
                    <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Autres revenus / mois</Text><Text style={s.resultValue}>{formatMoney(adminSelectedRequest.applicationForm.monthlyOtherIncome || 0)}</Text></View>
                    {adminSelectedRequest.applicationForm.additionalNotes ? (
                      <View style={[s.resultRow, { marginBottom: 16, alignItems: 'flex-start' }]}><Text style={s.resultLabel}>Remarques</Text><Text style={[s.resultValue, { flex: 1, textAlign: 'right' }]}>{String(adminSelectedRequest.applicationForm.additionalNotes)}</Text></View>
                    ) : (
                      <View style={{ marginBottom: 16 }} />
                    )}
                  </>
                ) : null}

                <SectionTitle {...themed}>Scoring et Décision</SectionTitle>
                <View style={[s.resultRow, { marginBottom: 16 }]}>
                  <Text style={s.resultLabel}>Ratio d'endettement estimé</Text>
                  <Text style={[s.resultValue, { color: adminSelectedRequest.debtRatio < 0.35 ? COLORS.success : adminSelectedRequest.debtRatio <= 0.45 ? COLORS.warning : COLORS.error }]}>
                    {formatPercent(adminSelectedRequest.debtRatio || 0)}
                    {adminSelectedRequest.debtRatio < 0.35 ? ' 🟢 Faible' : adminSelectedRequest.debtRatio <= 0.45 ? ' 🟡 Moyen' : ' 🔴 Risqué'}
                  </Text>
                </View>

                {adminSelectedRequest.status === 'pending' && (
                  <View style={{ gap: 12 }}>
                    <PrimaryButton label="✔ Accepter le crédit" onPress={() => onUpdateRequestStatus(adminSelectedRequest.id, 'accepted')} disabled={isActionBusy} {...themed} />
                    <View style={{ borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 12 }}>
                      <InputLabel {...themed}>Motif de refus (optionnel)</InputLabel>
                      <TextInput style={s.input} value={adminRejectionReason} onChangeText={setAdminRejectionReason} placeholder={"Ex: ratio d\u2019endettement trop \u00e9lev\u00e9"} />
                      <SecondaryButton label="✖ Refuser le crédit" onPress={() => onUpdateRequestStatus(adminSelectedRequest.id, 'rejected', adminRejectionReason)} disabled={isActionBusy} {...themed} />
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

      <BottomTabBar tabs={isAdmin ? tabsAdmin : tabsClient} active={view} onPress={setView} {...themed} />
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ─── STYLES ───
function createStyles(COLORS) {
  return StyleSheet.create({
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
  rowInputs: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  passwordField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, minHeight: 48 },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text, minWidth: 0 },
  passwordReveal: { paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: COLORS.surface, color: COLORS.text, fontFamily: FONTS.medium, fontSize: 14 },
  helper: { fontSize: 11, color: COLORS.textLight, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 17 },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  headerCompact: { paddingHorizontal: SPACING.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerLogo: { width: 34, height: 34, borderRadius: 10 },
  headerUserAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.surfaceAlt },
  headerGreet: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  headerName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  headerRight: { flexDirection: 'row', gap: 6 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  // Body
  body: { flex: 1 },
  bodyContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 24, width: '100%', maxWidth: 980, alignSelf: 'center' },
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
  kpiRow: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  // List items
  listItem: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, padding: SPACING.md, gap: 4, backgroundColor: COLORS.surface },
  listItemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  listItemTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14, flexShrink: 1 },
  listItemSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  // Credit types
  creditFilters: { gap: 10, marginBottom: 4 },
  creditSearchInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creditSearchText: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  creditType: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 4, backgroundColor: COLORS.surface },
  creditTypeActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  rateTag: { backgroundColor: COLORS.primary + '12', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  rateTagText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },
  checkMark: { position: 'absolute', top: 12, right: 12 },
  // Simulation
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm, padding: SPACING.sm },
  chipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surfaceAlt },
  presetChipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textSecondary },
  formHint: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  formMuted: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.warning, marginTop: -4 },
  formTextArea: { minHeight: 88, paddingTop: 12 },
  formMeta: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.primary },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxLabel: { flex: 1, fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text, lineHeight: 20 },
  resultCard: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: SPACING.lg, gap: 10, marginTop: 8 },
  resultTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text, marginBottom: 4 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  resultValue: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  scoreWrap: { gap: 8, marginTop: 4 },
  scoreHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { fontFamily: FONTS.bold, fontSize: 13 },
  scoreTrack: { width: '100%', height: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.border, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: RADIUS.full },
  // Chat
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatZone: { minHeight: 200, gap: 4 },
  chatInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW.elevated },
  // Pro
  proLead: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  proCard: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, padding: SPACING.md, gap: 4, backgroundColor: COLORS.surfaceAlt },
  recoCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, gap: 8, backgroundColor: COLORS.surface },
  recoRate: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary },
  proFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm, padding: SPACING.sm },
  proFeatureText: { flex: 1, fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },
  quickActionRow: { gap: 10 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  stepDot: { width: 10, height: 10, borderRadius: RADIUS.full },
  stepText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  // Admin layout + sidebar
  adminLayout: { flex: 1, flexDirection: 'row' },
  adminSidebarRail: {
    width: 224,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderLight,
    gap: 6,
  },
  adminSidebarDrawer: {
    flex: undefined,
    width: '82%',
    maxWidth: 300,
    borderRightWidth: 0,
    ...SHADOW.card,
    borderBottomLeftRadius: 0,
    borderTopLeftRadius: 0,
  },
  adminSidebarTitle: { fontFamily: FONTS.extraBold, fontSize: 15, color: COLORS.primaryDark, marginBottom: SPACING.sm, paddingHorizontal: SPACING.sm },
  adminNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  adminNavBtnActive: { backgroundColor: COLORS.primary },
  adminNavBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },
  adminNavBtnTextActive: { color: COLORS.white },
  adminDrawerRoot: { flex: 1, flexDirection: 'row' },
  adminDrawerScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  adminDrawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm, paddingHorizontal: SPACING.sm },
  profileAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginVertical: SPACING.md },
  profileAvatarTouch: { borderRadius: RADIUS.full, overflow: 'hidden' },
  profileAvatarImg: { width: 88, height: 88, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  profileAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  profileEmail: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  adminGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  adminActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  adminBtn: { borderRadius: RADIUS.sm, paddingVertical: 8, paddingHorizontal: 12 },
  adminBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, width: '90%', maxWidth: 500, borderRadius: RADIUS.xl, overflow: 'hidden' },
  modalContentCompact: { width: '96%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primaryDark },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textLight },
  filterChipTextActive: { color: COLORS.white },
  // Notifications
  notifyBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: COLORS.error, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  notifyBadgeText: { color: COLORS.white, fontSize: 10, fontFamily: FONTS.bold },
  notifyActions: { marginBottom: 10 },
  notifyItem: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, padding: SPACING.md, gap: 6, backgroundColor: COLORS.surface },
  notifyItemUnread: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  notifyItemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifyItemTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  notifyTypeTag: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.primary },
  notifyItemText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  notifyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  // Request progress
  requestProgressTrack: { width: '100%', height: 6, borderRadius: 4, backgroundColor: COLORS.borderLight, overflow: 'hidden', marginTop: 6 },
  requestProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  // Simulation actions
  simActionRow: { gap: 10, marginTop: 8 },
  amortWrap: { marginTop: 12, gap: 8 },
  amortToggle: { paddingVertical: 8 },
  amortToggleText: { fontFamily: FONTS.semiBold, color: COLORS.primary },
  amortTable: { gap: 6 },
  amortRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, backgroundColor: COLORS.surfaceAlt, padding: 8, borderRadius: RADIUS.sm },
  amortCell: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text },
  // Settings
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingLabel: { fontFamily: FONTS.semiBold, color: COLORS.text },
  toggle: { width: 52, height: 28, borderRadius: 14, backgroundColor: COLORS.borderLight, padding: 3 },
  toggleOn: { backgroundColor: COLORS.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white },
  toggleKnobOn: { alignSelf: 'flex-end' },
  langRow: { flexDirection: 'row', gap: 6 },
  langChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.surfaceAlt },
  langChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  langChipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textSecondary },
  langChipTextActive: { color: COLORS.white },
  otpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  otpInput: { flex: 1, minWidth: 90 },
  docRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  docActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  simCompareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  compareBox: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: SPACING.md, gap: 6, marginTop: 8 },
  compareTitle: { fontFamily: FONTS.bold, color: COLORS.text },
  profileStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  profileStatusLabel: { fontFamily: FONTS.semiBold, color: COLORS.textSecondary },
  qrWrap: { alignItems: 'center', gap: 12 },
  });
}
