import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Image, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions, Modal, useWindowDimensions
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, CreditCard, Calculator, MessageCircle, ShieldCheck, Wallet, Banknote, LogOut, RefreshCw, User, Send, ChevronRight, TrendingUp, Clock, CheckCircle2, XCircle, BarChart3, Users, FileText, Search, Filter, Eye, EyeOff, Menu, LayoutDashboard, ClipboardList, CircleUser, X as XIcon, Bell, Fingerprint, Moon, Sun, Camera, Upload, FileDown, QrCode, Globe, Lock, Car, Calendar, DollarSign, Check, ChevronLeft, Percent, IdCard, File, Trash2 } from 'lucide-react-native';
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
import { DARK_COLORS, LIGHT_COLORS, FONTS, RADIUS, SPACING, TYPO, createShadows } from './src/theme';
import { StatusBadge, EmptyState, BottomTabBar, KpiCard, SectionCard, SectionTitle, PrimaryButton, SecondaryButton, InputLabel, ChatBubble } from './src/components';
import AtbCreditApplicationForm from './src/AtbCreditApplicationForm';
import { createInitialAtbForm, validateAtbForm, atbFormToPayload, inferCreditCategory, professionalStatusLabel } from './src/atbCreditForm';

const ATB_LOGO = require('./assets/image.png');

const MAX_DOC_DATA_URL = 900000;
const DOC_TYPES = [
  { id: 'cin', label: 'CIN', hint: "Carte d'identité nationale", Icon: IdCard },
  { id: 'payslip', label: 'Fiche de paie', hint: 'Justificatif de revenus', Icon: FileText },
  { id: 'selfie', label: 'Selfie', hint: 'Photo de vérification', Icon: Camera },
  { id: 'other', label: 'Autre', hint: 'Document complémentaire', Icon: File },
];

function formatMoney(v) { return `${Number(v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} TND`; }
function formatPercent(v) { const n = Number(v || 0) * (v <= 1 ? 100 : 1); return `${n.toFixed(1)}%`; }

function docTypeMeta(type) {
  return DOC_TYPES.find((d) => d.id === type) || DOC_TYPES[3];
}

function isImageMime(mime = '') {
  return String(mime).startsWith('image/');
}

async function compressImageDataUrl(dataUrl, maxLen = MAX_DOC_DATA_URL - 5000) {
  if (!dataUrl || dataUrl.length <= maxLen) return dataUrl;
  if (Platform.OS !== 'web' || typeof document === 'undefined') return dataUrl;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      const scale = Math.min(1, 1400 / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let quality = 0.85;
      let out = canvas.toDataURL('image/jpeg', quality);
      while (out.length > maxLen && quality > 0.35) {
        quality -= 0.08;
        out = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(out);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function applyDocDraft(dataUrl, fileName, mimeType, setError, setDocDraft) {
  if (!dataUrl || dataUrl.length > MAX_DOC_DATA_URL) {
    setError('Document trop volumineux (réduisez la taille ou choisissez une autre image).');
    return;
  }
  setDocDraft({
    dataUrl,
    fileName: String(fileName || `document-${Date.now()}.jpg`).slice(0, 255),
    mimeType: String(mimeType || 'image/jpeg').slice(0, 120),
  });
  setError('');
}

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
  { key: 'users', label: 'Utilisateurs', icon: Users },
  { key: 'products', label: 'Offres crédit', icon: CreditCard },
  { key: 'profile', label: 'Profil', icon: CircleUser },
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPasswordAuth, setConfirmPasswordAuth] = useState('');
  const [salary, setSalary] = useState('2500');
  const [dashboard, setDashboard] = useState(null);
  const [creditTypes, setCreditTypes] = useState([]);
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminRequests, setAdminRequests] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [selectedCreditTypeId, setSelectedCreditTypeId] = useState('');
  const [amount, setAmount] = useState('10000');
  const [durationMonths, setDurationMonths] = useState('36');
  const [estimationResult, setEstimationResult] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [editingCreditTypeId, setEditingCreditTypeId] = useState(null);
  const [editingRate, setEditingRate] = useState('');
  const [editingIsActive, setEditingIsActive] = useState(true);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [adminDateFrom, setAdminDateFrom] = useState('');
  const [adminDateTo, setAdminDateTo] = useState('');
  const [adminUserSearchQuery, setAdminUserSearchQuery] = useState('');
  const [adminUserRoleFilter, setAdminUserRoleFilter] = useState('all');
  const [adminSelectedRequest, setAdminSelectedRequest] = useState(null);
  const [adminRequestDocuments, setAdminRequestDocuments] = useState([]);
  const [adminDocsLoading, setAdminDocsLoading] = useState(false);
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
  const [atbForm, setAtbForm] = useState(() => createInitialAtbForm(null));
  const [adminPage, setAdminPage] = useState('overview');
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
  const [profileAvatarDraft, setProfileAvatarDraft] = useState(null);
  const [profileAvatarUrlInput, setProfileAvatarUrlInput] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileProfession, setProfileProfession] = useState('');
  const [profileAccountType, setProfileAccountType] = useState('particulier');
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
    setProfileAccountType(typeof user?.accountType === 'string' ? user.accountType : 'particulier');
  }, [user?.id, user?.phone, user?.city, user?.profession, user?.accountType]);

  useEffect(() => {
    if (user?.id) setAtbForm(createInitialAtbForm(user));
  }, [user?.id, user?.phone, user?.city, user?.cin, user?.profession, user?.accountType]);

  useEffect(() => {
    if (selectedType?.name) {
      setAtbForm((prev) => ({ ...prev, creditCategory: inferCreditCategory(selectedType.name) }));
    }
  }, [selectedType?.id, selectedType?.name]);

  useEffect(() => {
    const sal = dashboard?.client?.salary ?? user?.salary;
    if (sal != null && Number(sal) > 0) setSalary(String(sal));
  }, [user?.id, user?.salary, dashboard?.client?.salary]);

  useEffect(() => {
    if (!isAdmin || !token || !adminSelectedRequest?.userId) {
      setAdminRequestDocuments([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        setAdminDocsLoading(true);
        const docs = await apiRequest(`/admin/users/${adminSelectedRequest.userId}/documents`, {}, token);
        if (cancelled) return;
        const ids = adminSelectedRequest.applicationForm?.attachedDocumentIds;
        const list = Array.isArray(ids) && ids.length
          ? docs.filter((d) => ids.includes(d.id))
          : docs;
        setAdminRequestDocuments(list);
      } catch {
        if (!cancelled) setAdminRequestDocuments([]);
      } finally {
        if (!cancelled) setAdminDocsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adminSelectedRequest?.id, adminSelectedRequest?.userId, token, isAdmin]);

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
        await loadAdminUsers(authToken);
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

  async function loadAdminUsers(authToken = token) {
    if (!authToken) return;
    try {
      const params = new URLSearchParams();
      if (adminUserRoleFilter !== 'all') params.set('role', adminUserRoleFilter);
      if (adminUserSearchQuery.trim()) params.set('q', adminUserSearchQuery.trim());
      const qs = params.toString();
      const users = await apiRequest(`/admin/users${qs ? `?${qs}` : ''}`, {}, authToken);
      setAdminUsers(users || []);
    } catch (e) {
      setError(e.message || 'Chargement utilisateurs admin impossible.');
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

  async function onRequestAuthOtp() {
    const e = email.trim().toLowerCase();
    if (!e) { setError('Email obligatoire pour envoyer le code OTP.'); return; }
    try {
      setError(''); setNotice(''); setAuthOtpStatus(''); setIsAuthBusy(true);
      const res = await apiRequest('/auth/request-otp-public', {
        method: 'POST',
        body: JSON.stringify({ email: e }),
      });
      setAuthOtpStatus(res.message || 'OTP envoye.');
      setNotice('Code OTP envoye par email.');
    } catch (err) {
      setError(err.message || 'Envoi OTP impossible.');
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function onVerifyAuthOtp() {
    const e = email.trim().toLowerCase();
    const code = authOtpCode.trim();
    if (!e) { setError('Email obligatoire pour verifier le code OTP.'); return; }
    if (!code) { setError('Saisissez le code OTP.'); return; }
    try {
      setError(''); setNotice(''); setAuthOtpStatus(''); setIsAuthBusy(true);
      const res = await apiRequest('/auth/verify-otp-public', {
        method: 'POST',
        body: JSON.stringify({ email: e, code }),
      });
      setAuthOtpStatus(res.message || 'Email verifie.');
      setNotice('Email verifie avec succes.');
      setAuthOtpCode('');
      setUser((prev) => (prev ? { ...prev, emailVerified: true } : prev));
    } catch (err) {
      setError(err.message || 'Verification OTP impossible.');
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function onResetForgotPassword() {
    const e = email.trim().toLowerCase();
    const code = authOtpCode.trim();
    if (!e) { setError('Email obligatoire.'); return; }
    if (!code) { setError('Saisissez le code OTP.'); return; }
    if (!password || !confirmPasswordAuth) { setError('Nouveau mot de passe et confirmation obligatoires.'); return; }
    if (password !== confirmPasswordAuth) { setError('Les mots de passe ne correspondent pas.'); return; }
    try {
      setError(''); setNotice(''); setAuthOtpStatus(''); setIsAuthBusy(true);
      const res = await apiRequest('/auth/reset-password-public', {
        method: 'POST',
        body: JSON.stringify({ email: e, code, newPassword: password }),
      });
      setAuthOtpStatus(res.message || 'Mot de passe reinitialise.');
      setNotice('Mot de passe reinitialise. Vous pouvez vous connecter.');
      setPassword('');
      setConfirmPasswordAuth('');
      setAuthOtpCode('');
      setAuthMode('login');
    } catch (err) {
      setError(err.message || 'Reinitialisation impossible.');
    } finally {
      setIsAuthBusy(false);
    }
  }

  function onLogout() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setToken(''); setUser(null); setView('dashboard'); setDashboard(null); setCreditTypes([]);
    setSelectedCreditTypeId(''); setEstimationResult(null); setChatMessages([]); setAdminSummary(null); setAdminRequests([]); setAdminUsers([]); setNotice(''); setError('');
    setCreditsSubView('categories'); setSelectedCategory(null); setSelectedCredit(null); setCreditStartTab('active');
    setAtbForm(createInitialAtbForm(null));
    setAdminPage('overview'); setAdminSidebarOpen(false); setAdminUserSearchQuery(''); setAdminUserRoleFilter('all'); setProfileAvatarDraft(null); setProfileAvatarUrlInput('');
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
      const body = {
        fullName: name,
        phone: profilePhone.trim(),
        city: profileCity.trim(),
        profession: profileProfession.trim(),
        accountType: profileAccountType,
      };
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

  function pickDocumentFromWebFile() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 650000) {
        setError('Fichier trop volumineux (max ~650 Ko).');
        return;
      }
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          let dataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (!dataUrl) { setError('Lecture du fichier impossible.'); return; }
          if (isImageMime(file.type)) {
            dataUrl = await compressImageDataUrl(dataUrl);
          }
          applyDocDraft(dataUrl, file.name, file.type || 'application/octet-stream', setError, setDocDraft);
          setNotice('Document prêt à être envoyé.');
        };
        reader.onerror = () => setError('Lecture du fichier impossible.');
        reader.readAsDataURL(file);
      } catch (err) {
        setError(err.message || 'Import document impossible.');
      }
    };
    input.click();
  }

  async function onPickDocument() {
    if (Platform.OS === 'web') {
      pickDocumentFromWebFile();
      return;
    }
    try {
      setError('');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Permission galerie refusée.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        quality: 0.55,
        allowsEditing: true,
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? ['images'],
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) { setError('Document invalide.'); return; }
      const mimeType = asset.mimeType || 'image/jpeg';
      let dataUrl = `data:${mimeType};base64,${asset.base64}`;
      dataUrl = await compressImageDataUrl(dataUrl);
      applyDocDraft(
        dataUrl,
        asset.fileName || `document-${Date.now()}.jpg`,
        mimeType,
        setError,
        setDocDraft,
      );
      setNotice('Document prêt à être envoyé.');
    } catch (e) {
      setError(e.message || 'Import document impossible.');
    }
  }

  async function onUploadDocument() {
    if (!docDraft) { setError('Choisissez d’abord un document.'); return; }
    if (docDraft.dataUrl.length > MAX_DOC_DATA_URL) {
      setError('Document trop volumineux pour l’envoi.');
      return;
    }
    try {
      setError(''); setNotice(''); setIsUploadingDoc(true);
      const payload = {
        type: docType,
        fileName: docDraft.fileName,
        mimeType: docDraft.mimeType,
        dataUrl: docDraft.dataUrl,
      };
      const created = await apiRequest('/documents', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, token);
      setDocuments((prev) => [created, ...prev]);
      setDocDraft(null);
      setNotice('Document enregistré avec succès.');
    } catch (e) {
      setError(e.message || 'Upload impossible.');
    } finally {
      setIsUploadingDoc(false);
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

  async function buildApplicationFormPdf(creditName, form = atbForm) {
    const f = form || {};
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const { height: pageHeight, width: pageWidth } = page.getSize();
    
    // Margins and Columns
    const margin = 35;
    const contentWidth = pageWidth - margin * 2; // 525
    let y = pageHeight - 35; // 807
    
    const drawLineField = (label, value, x, y, width) => {
      page.drawText(label, { x, y, size: 7, font: fontBold, color: { r: 0.15, g: 0.15, b: 0.15 } });
      const labelWidth = fontBold.widthOfTextAtSize(label, 7);
      const startX = x + labelWidth + 3;
      const lineWidth = width - labelWidth - 3;
      if (value) {
        page.drawText(String(value), { x: startX + 2, y, size: 7, font, color: { r: 0.2, g: 0.2, b: 0.2 } });
      }
      page.drawLine({
        start: { x: startX, y: y - 1 },
        end: { x: startX + lineWidth, y: y - 1 },
        thickness: 0.5,
        color: { r: 0.75, g: 0.75, b: 0.75 }
      });
    };

    const drawCheckboxField = (x, y, label, checked) => {
      page.drawRectangle({
        x,
        y: y - 1,
        width: 7,
        height: 7,
        borderColor: { r: 0.4, g: 0.4, b: 0.4 },
        borderWidth: 0.75,
        color: checked ? { r: 166/255, g: 25/255, b: 46/255 } : undefined
      });
      page.drawText(label, { x: x + 11, y, size: 7, font, color: { r: 0.2, g: 0.2, b: 0.2 } });
    };

    const drawSectionHeader = (title, secY) => {
      page.drawRectangle({
        x: margin,
        y: secY - 3,
        width: contentWidth,
        height: 12,
        color: { r: 240/255, g: 242/255, b: 245/255 },
      });
      page.drawText(title, {
        x: margin + 5,
        y: secY,
        size: 8,
        font: fontBold,
        color: { r: 166/255, g: 25/255, b: 46/255 },
      });
    };

    // Header Rect
    page.drawRectangle({
      x: margin,
      y: y - 40,
      width: contentWidth,
      height: 40,
      color: { r: 166/255, g: 25/255, b: 46/255 },
    });
    
    page.drawText('ARAB TUNISIAN BANK - ATB', {
      x: margin + 15,
      y: y - 16,
      size: 11,
      font: fontBold,
      color: { r: 1, g: 1, b: 1 },
    });
    
    page.drawText('DEMANDE DE CRÉDIT AUX PARTICULIERS / AGENCE ATB', {
      x: margin + 15,
      y: y - 28,
      size: 8,
      font: font,
      color: { r: 0.9, g: 0.9, b: 0.9 },
    });

    page.drawText('Page 1/1', {
      x: pageWidth - margin - 55,
      y: y - 22,
      size: 8,
      font: fontBold,
      color: { r: 1, g: 1, b: 1 },
    });
    
    y -= 52;
    
    // Metadata row
    drawLineField('Agence :', f.agency || 'Tunis Lafayette', margin, y, 150);
    drawLineField('Date :', new Date().toLocaleDateString('fr-FR'), margin + 170, y, 140);
    drawLineField('N° de Compte :', user?.accountNumber || '—', margin + 330, y, 195);
    
    y -= 18;
    
    // SECTION 1: CLIENT 1
    drawSectionHeader('1. DONNÉES DU DEMANDEUR DE CRÉDIT (CLIENT 1)', y);
    y -= 14;
    drawLineField('Nom & Prénom :', user?.fullName || '—', margin, y, 525);
    
    y -= 14;
    page.drawText("Pièce d'identité :", { x: margin, y, size: 7, font: fontBold });
    const idType = f.idType || 'cin';
    drawCheckboxField(margin + 80, y, 'CIN', idType === 'cin');
    drawCheckboxField(margin + 130, y, 'Passeport', idType === 'passeport');
    drawCheckboxField(margin + 200, y, 'Carte de Séjour', idType === 'carte_sejour');
    drawLineField('N° Pièce :', f.idNumber || user?.cin || '—', margin + 300, y, 225);
    
    y -= 14;
    page.drawText("Situation Prof. :", { x: margin, y, size: 7, font: fontBold });
    const ps = f.professionalStatus || 'titulaire';
    drawCheckboxField(margin + 80, y, 'Titulaire', ps === 'titulaire');
    drawCheckboxField(margin + 140, y, 'Contractuel', ps === 'contractuel');
    drawCheckboxField(margin + 210, y, 'Retraité', ps === 'retraite');
    drawCheckboxField(margin + 270, y, 'Libéral / Chef entreprise', ps === 'professionnel');
    
    y -= 14;
    drawLineField('Revenu Net Mensuel (TND) :', formatMoney(user?.salary || salary).replace(' TND', ''), margin, y, 240);
    const otherIncomeLbl = f.otherIncomeAmount ? `${f.otherIncomeAmount} TND` : '—';
    drawLineField('Autres sources revenus :', otherIncomeLbl, margin + 260, y, 265);
    y -= 14;
    drawLineField('Adresse :', f.address || '—', margin, y, 525);
    y -= 18;
    
    // SECTION 2: CLIENT 2 (JOINT ACCOUNT)
    drawSectionHeader('2. COMPTE JOINT - DONNÉES DU DEUXIÈME DEMANDEUR (SI APPLICABLE)', y);
    y -= 14;
    drawLineField('Nom & Prénom :', f.client2Enabled ? (f.client2Name || '—') : '—', margin, y, 525);
    
    y -= 14;
    page.drawText("Pièce d'identité :", { x: margin, y, size: 7, font: fontBold });
    const c2Id = f.client2IdType || 'cin';
    drawCheckboxField(margin + 80, y, 'CIN', f.client2Enabled && c2Id === 'cin');
    drawCheckboxField(margin + 130, y, 'Passeport', f.client2Enabled && c2Id === 'passeport');
    drawCheckboxField(margin + 200, y, 'Carte de Séjour', f.client2Enabled && c2Id === 'carte_sejour');
    drawLineField('N° Pièce :', f.client2Enabled ? (f.client2IdNumber || '—') : '—', margin + 300, y, 225);
    
    y -= 14;
    page.drawText("Situation Prof. :", { x: margin, y, size: 7, font: fontBold });
    const c2ps = f.client2ProfessionalStatus || 'titulaire';
    drawCheckboxField(margin + 80, y, 'Titulaire', f.client2Enabled && c2ps === 'titulaire');
    drawCheckboxField(margin + 140, y, 'Contractuel', f.client2Enabled && c2ps === 'contractuel');
    drawCheckboxField(margin + 210, y, 'Retraité', f.client2Enabled && c2ps === 'retraite');
    drawCheckboxField(margin + 270, y, 'Libéral / Chef entreprise', f.client2Enabled && c2ps === 'professionnel');
    drawLineField('Revenu Net :', f.client2Enabled ? (f.client2NetSalary || '—') : '—', margin + 380, y, 145);
    
    y -= 18;
    
    // SECTION 3: CONJOINT
    drawSectionHeader('3. DONNÉES DU CONJOINT (ÉPOUX / ÉPOUSE)', y);
    y -= 14;
    drawLineField('Nom & Prénom :', f.spouseEnabled ? (f.spouseName || '—') : '—', margin, y, 240);
    drawLineField('Employeur / Entreprise :', f.spouseEnabled ? (f.spouseEmployer || '—') : '—', margin + 260, y, 265);
    
    y -= 14;
    page.drawText("Situation Prof. :", { x: margin, y, size: 7, font: fontBold });
    const sps = f.spouseProfessionalStatus || 'titulaire';
    drawCheckboxField(margin + 80, y, 'Titulaire', f.spouseEnabled && sps === 'titulaire');
    drawCheckboxField(margin + 140, y, 'Contractuel', f.spouseEnabled && sps === 'contractuel');
    drawCheckboxField(margin + 210, y, 'Retraité', f.spouseEnabled && sps === 'retraite');
    drawCheckboxField(margin + 270, y, 'Libéral / Chef entreprise', f.spouseEnabled && sps === 'professionnel');
    drawLineField('Revenu Net :', f.spouseEnabled ? (f.spouseNetSalary || '—') : '—', margin + 380, y, 145);
    
    y -= 18;
    
    // SECTION 4: CREDIT DONNEES
    drawSectionHeader('4. DONNÉES DU CRÉDIT SOLLICITÉ', y);
    y -= 14;
    drawLineField('Montant du Crédit (TND) :', String(amount || ''), margin, y, 160);
    drawLineField('Objet du Crédit :', f.creditPurpose || creditName || '—', margin + 175, y, 350);
    
    y -= 14;
    drawLineField('Garanties Proposées :', f.guarantees || 'Domiciliation de salaire et assurance emprunteur', margin, y, 525);
    
    y -= 14;
    const per = f.repaymentPeriodicity || 'mensuelle';
    page.drawText("Périodicité Remb. :", { x: margin, y, size: 7, font: fontBold });
    drawCheckboxField(margin + 100, y, 'Mensuelle', per === 'mensuelle');
    drawCheckboxField(margin + 170, y, 'Trimestrielle', per === 'trimestrielle');
    drawCheckboxField(margin + 250, y, 'Semestrielle', per === 'semestrielle');
    drawCheckboxField(margin + 330, y, 'Annuelle', per === 'annuelle');
    drawLineField('Durée (Mois) :', String(durationMonths || ''), margin + 410, y, 115);
    
    y -= 14;
    page.drawText("Convention :", { x: margin, y, size: 7, font: fontBold });
    drawCheckboxField(margin + 100, y, 'Oui (Cadre convention)', f.convention === 'oui');
    drawCheckboxField(margin + 220, y, 'Non', f.convention !== 'oui');
    drawLineField('Nom de la Convention :', f.convention === 'oui' ? (f.conventionName || '—') : '—', margin + 280, y, 245);
    
    y -= 18;
    
    // SECTION 5: CATEGORY SPECIFICS
    drawSectionHeader('5. TYPE DE CRÉDIT & INFORMATIONS COMPLÉMENTAIRES', y);
    y -= 14;
    
    const cat = f.creditCategory || inferCreditCategory(creditName);
    const isSayara = cat === 'vehicule';
    const isImmob = cat === 'immobilier';
    const isConsom = cat === 'consommation';
    
    drawCheckboxField(margin, y, 'CRÉDIT VÉHICULE (SAYARA)', isSayara);
    drawCheckboxField(margin + 170, y, 'CRÉDIT IMMOBILIER (SAKAN/RENOV)', isImmob);
    drawCheckboxField(margin + 355, y, 'CRÉDIT DE CONSOMMATION / AUTRE', isConsom);
    
    y -= 15;
    
    if (isSayara) {
      drawLineField('Puissance fiscale (CV) :', f.vehicleFiscalPower || '—', margin + 15, y, 140);
      drawCheckboxField(margin + 175, y, 'Véhicule Neuf', f.vehicleIsNew !== false);
      drawCheckboxField(margin + 265, y, 'Véhicule Occasion', f.vehicleIsNew === false);
      drawLineField('1ère Mise en circulation :', f.vehicleFirstCirculation || '—', margin + 365, y, 160);
    } else if (isImmob) {
      drawCheckboxField(margin + 15, y, 'Construction', Boolean(f.immoConstruction));
      drawCheckboxField(margin + 100, y, 'Aménagement', Boolean(f.immoAmenagement));
      drawCheckboxField(margin + 190, y, 'Terrain', Boolean(f.immoTerrain));
      drawCheckboxField(margin + 265, y, 'Achat Promoteur', Boolean(f.immoPromoter));
      drawCheckboxField(margin + 365, y, 'Achat Particulier', Boolean(f.immoParticulier));
      y -= 13;
      drawLineField('Valeur estimée du bien / coût total des travaux (TND) :', f.propertyValue || String(amount || ''), margin + 15, y, 510);
    } else {
      page.drawText("Détails consommation : Crédit destiné au financement des besoins personnels courants.", {
        x: margin + 15,
        y,
        size: 7,
        font,
        color: { r: 0.3, g: 0.3, b: 0.3 }
      });
    }
    
    y -= 22;
    
    // SECTION 6: SIGNATURES
    drawSectionHeader('6. SIGNATURES & DÉCLARATION DES PARTIES', y);
    y -= 15;
    page.drawText("Déclaration demandeur : Je certifie l'exactitude des informations fournies ci-dessus.", {
      x: margin,
      y,
      size: 6.5,
      font: font,
      color: { r: 0.3, g: 0.3, b: 0.3 }
    });
    
    y -= 12;
    
    const sigBoxHeight = 55;
    const sigBoxWidth = 150;
    
    // Sig box 1
    page.drawRectangle({
      x: margin + 10,
      y: y - sigBoxHeight,
      width: sigBoxWidth,
      height: sigBoxHeight,
      borderColor: { r: 0.8, g: 0.8, b: 0.8 },
      borderWidth: 0.5,
    });
    page.drawText('Signature du Demandeur 1', { x: margin + 15, y: y - 10, size: 7, font: fontBold });
    
    // Sig box 2
    page.drawRectangle({
      x: margin + 185,
      y: y - sigBoxHeight,
      width: sigBoxWidth,
      height: sigBoxHeight,
      borderColor: { r: 0.8, g: 0.8, b: 0.8 },
      borderWidth: 0.5,
    });
    page.drawText('Signature du Demandeur 2', { x: margin + 190, y: y - 10, size: 7, font: fontBold });
    
    // Visa box
    page.drawRectangle({
      x: margin + 360,
      y: y - sigBoxHeight,
      width: sigBoxWidth,
      height: sigBoxHeight,
      color: { r: 250/255, g: 250/255, b: 250/255 },
      borderColor: { r: 0.8, g: 0.8, b: 0.8 },
      borderWidth: 0.5,
    });
    page.drawText('Visa et Cachet ATB', { x: margin + 365, y: y - 10, size: 7, font: fontBold, color: { r: 166/255, g: 25/255, b: 46/255 } });
    
    y -= (sigBoxHeight + 15);
    
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: { r: 0.8, g: 0.8, b: 0.8 }
    });
    
    y -= 10;
    
    page.drawText('RÉFÉRENCE TECHNIQUE : DCRT/03-2016/V3', {
      x: margin,
      y,
      size: 6,
      font: font,
      color: { r: 0.5, g: 0.5, b: 0.5 }
    });
    
    page.drawText('Arab Tunisian Bank - ATB Banque Tunisienne', {
      x: pageWidth - margin - 180,
      y,
      size: 6,
      font: font,
      color: { r: 0.5, g: 0.5, b: 0.5 }
    });
    
    const base64 = await pdf.saveAsBase64({ dataUri: false });
    return base64;
  }

  async function onDownloadDemandeCredit(creditName) {
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      const base64 = await buildApplicationFormPdf(creditName, atbForm);
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

  function validateSim() {
    if (!selectedCreditTypeId) return 'Sélectionne un type de crédit.';
    const a = Number(amount);
    const d = Number(durationMonths);
    const sal = Number(String(salary).replace(',', '.'));
    if (!Number.isFinite(a) || a <= 0) return 'Le montant doit être positif.';
    if (!Number.isFinite(d) || d <= 0) return 'La durée doit être positive.';
    if (!Number.isFinite(sal) || sal <= 0) return 'Le salaire net mensuel doit être positif.';
    if (selectedType) {
      if (a < selectedType.minAmount || a > selectedType.maxAmount) return `Montant: ${selectedType.minAmount} – ${selectedType.maxAmount}`;
      if (d < selectedType.minDurationMonths || d > selectedType.maxDurationMonths) return `Durée: ${selectedType.minDurationMonths} – ${selectedType.maxDurationMonths} mois`;
    }
    return '';
  }

  async function onEstimate() {
    const ve = validateSim();
    if (ve) { setError(ve); return; }
    try {
      setError(''); setNotice(''); setIsEstimating(true);
      const sal = Number(String(salary).replace(',', '.'));
      const monthlyOtherIncome = Number(String(atbForm.otherIncomeAmount).replace(',', '.')) || 0;
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
      setEstimationResult(r);
      setShowSchedule(false);
      setNotice('Estimation calculée !');
    } catch (e) {
      setError(e.message || 'Estimation impossible.');
    } finally {
      setIsEstimating(false);
    }
  }

  async function onSubmitRequest() {
    const ve = validateSim(); if (ve) { setError(ve); return; }
    if (!estimationResult) { setError('Calculez d’abord l’estimation, puis complétez le formulaire.'); return; }
    const fv = validateAtbForm(atbForm, user); if (fv) { setError(fv); return; }
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      await apiRequest('/requests', {
        method: 'POST',
        body: JSON.stringify({
          creditTypeId: Number(selectedCreditTypeId),
          requestedAmount: Number(amount),
          requestedDurationMonths: Number(durationMonths),
          salary: Number(String(salary).replace(',', '.')),
          applicationForm: {
            ...atbFormToPayload(atbForm, user),
            attachedDocumentIds: documents.map((d) => d.id),
            simulationSalary: Number(String(salary).replace(',', '.')),
          },
        }),
      }, token);
      await loadInitialData(); setView('dashboard'); setNotice('Demande soumise avec succès !');
      setAtbForm((prev) => ({ ...prev, acceptsDeclaration: false, additionalNotes: '' }));
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

  async function onUpdateUserRole(id, role) {
    try {
      setError(''); setNotice(''); setIsActionBusy(true);
      await apiRequest(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }, token);
      await loadAdminUsers();
      setNotice('Role utilisateur mis a jour.');
    } catch (e) {
      setError(e.message || 'Mise a jour du role impossible.');
    } finally {
      setIsActionBusy(false);
    }
  }

  const tabsClient = [
    { key: 'dashboard', label: t('tab.dashboard'), icon: Home },
    { key: 'credits', label: t('tab.credits'), icon: CreditCard },
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
                  placeholder={authMode === 'forgot' ? 'Nouveau mot de passe' : t('auth.password')}
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
              {authMode === 'login' && (
                <Pressable onPress={() => { setAuthMode('forgot'); setAuthOtpStatus(''); setError(''); setNotice(''); }}>
                  <Text style={[s.formMeta, { textAlign: 'right' }]}>Mot de passe oublie ?</Text>
                </Pressable>
              )}
              {(authMode === 'register' || authMode === 'forgot') && (
                <View style={s.passwordField}>
                  <TextInput
                    style={s.passwordInput}
                    value={confirmPasswordAuth}
                    onChangeText={setConfirmPasswordAuth}
                    secureTextEntry={!confirmPasswordVisible}
                    placeholder={authMode === 'forgot' ? 'Confirmer le nouveau mot de passe' : t('auth.confirmPassword')}
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

              <PrimaryButton
                label={authMode === 'login' ? t('auth.loginBtn') : authMode === 'forgot' ? 'Reinitialiser le mot de passe' : t('auth.registerBtn')}
                onPress={authMode === 'login' ? onLogin : authMode === 'forgot' ? onResetForgotPassword : onRegister}
                disabled={isAuthBusy}
                loading={isAuthBusy}
                colors={COLORS}
              />

              {(authMode === 'register' || authMode === 'forgot') && (
                <>
                  <View style={s.otpRow}>
                    <SecondaryButton label={t('auth.sendOtp')} onPress={onRequestAuthOtp} disabled={isAuthBusy} colors={COLORS} />
                    <TextInput style={[s.input, s.otpInput]} value={authOtpCode} onChangeText={setAuthOtpCode} placeholder={t('auth.otpPlaceholder')} placeholderTextColor={COLORS.textLight} keyboardType="numeric" />
                    {authMode === 'register' ? <PrimaryButton label={t('auth.verifyEmail')} onPress={onVerifyAuthOtp} disabled={isAuthBusy} colors={COLORS} /> : null}
                  </View>
                  {authOtpStatus ? <Text style={s.formHint}>{authOtpStatus}</Text> : null}
                </>
              )}
              {authMode === 'forgot' ? (
                <SecondaryButton label="Retour connexion" onPress={() => { setAuthMode('login'); setAuthOtpCode(''); setAuthOtpStatus(''); setError(''); }} disabled={isAuthBusy} colors={COLORS} />
              ) : null}

              {storedToken && biometricEnabled ? (
                <SecondaryButton
                  label={biometricBusy ? t('common.loading') : t('common.biometricLogin')}
                  onPress={attemptBiometricLogin}
                  disabled={biometricBusy}
                  colors={COLORS}
                />
              ) : null}

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
            <Text style={s.headerGreet}>
              {user?.role === 'admin'
                ? 'Administrateur'
                : user?.accountType === 'professionnel'
                ? 'Compte Professionnel'
                : 'Compte Particulier'}
            </Text>
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
              <KpiCard icon={TrendingUp} label="Type actif" value={selectedType?.name || '-'} color={COLORS.success} {...themed} />
              <KpiCard icon={Bell} label="Notifications" value={unreadCount} color={COLORS.primary} {...themed} />
            </View>

            <View style={s.quickActionRow}>
              <PrimaryButton label="Voir les crédits" onPress={() => setView('credits')} {...themed} />
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

        {/* ── SIMULATION ── */}
        {view === 'simulation' && (
          <SectionCard {...themed}>
            <SectionTitle {...themed}>Simulation de crédit</SectionTitle>
            <InputLabel {...themed}>Type de crédit</InputLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.creditTypeScroll}>
              {creditTypes.filter((t) => t.isActive).map((t) => {
                const active = String(selectedCreditTypeId) === String(t.id);
                return (
                  <Pressable
                    key={t.id}
                    style={[s.creditTypeChip, active && s.creditTypeChipActive]}
                    onPress={() => { setSelectedCreditTypeId(String(t.id)); setEstimationResult(null); }}
                  >
                    <Text style={[s.creditTypeChipText, active && s.creditTypeChipTextActive]} numberOfLines={2}>
                      {t.name}
                    </Text>
                    <Text style={[s.creditTypeChipRate, active && s.creditTypeChipTextActive]}>{t.annualRate}%</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {!selectedCreditTypeId ? (
              <Text style={s.formMuted}>Sélectionnez un type de crédit pour lancer l’estimation.</Text>
            ) : (
              <View style={s.chipRow}>
                <CreditCard size={16} color={COLORS.primary} />
                <Text style={s.chipText}>Type : {selectedType?.name || '—'}</Text>
              </View>
            )}
            <InputLabel {...themed}>Salaire net mensuel (TND)</InputLabel>
            <TextInput
              style={s.input}
              keyboardType="decimal-pad"
              value={salary}
              onChangeText={(v) => { setSalary(v); setEstimationResult(null); }}
              placeholder="Ex: 2500"
              placeholderTextColor={COLORS.textLight}
            />
            <Text style={s.formHint}>Revenu pris en compte pour le ratio d’endettement.</Text>
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

            <View style={s.estimateActionWrap}>
              <PrimaryButton
                label={"Calculer l\u2019estimation"}
                onPress={onEstimate}
                disabled={isEstimating || !selectedCreditTypeId}
                loading={isEstimating}
                {...themed}
              />
            </View>

            {!estimationResult ? <Text style={s.formMuted}>Après estimation, vous pourrez remplir le formulaire et envoyer la demande.</Text> : null}

            {estimationResult ? (
              <View style={s.resultCard}>
                <Text style={s.resultTitle}>{"Résultat de l\u2019estimation"}</Text>
                <View style={s.resultRow}><Text style={s.resultLabel}>Salaire retenu</Text><Text style={s.resultValue}>{formatMoney(estimationResult.input?.salary ?? salary)}</Text></View>
                <View style={s.resultRow}><Text style={s.resultLabel}>Montant</Text><Text style={s.resultValue}>{formatMoney(estimationResult.input?.amount ?? amount)}</Text></View>
                <View style={s.resultRow}><Text style={s.resultLabel}>Durée</Text><Text style={s.resultValue}>{estimationResult.input?.durationMonths ?? durationMonths} mois</Text></View>
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

            {estimationResult ? (
              <Text style={[s.formHint, documents.length > 0 && { color: COLORS.success }]}>
                {documents.length > 0
                  ? `${documents.length} document(s) joint(s) au dossier (visible par l’administrateur).`
                  : 'Conseil : déposez CIN / fiche de paie dans Profil avant de soumettre la demande.'}
              </Text>
            ) : null}

            <AtbCreditApplicationForm
              form={atbForm}
              setForm={setAtbForm}
              user={user}
              amount={amount}
              durationMonths={durationMonths}
              creditName={selectedType?.name}
              colors={COLORS}
              onSubmit={onSubmitRequest}
              onDownloadPdf={() => onDownloadDemandeCredit(selectedType?.name || 'Crédit')}
              disabled={isActionBusy || !estimationResult}
            />
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

        {isAdmin && view === 'admin' && adminPage === 'users' && (
          <SectionCard {...themed}>
            <SectionTitle {...themed}>Gestion utilisateurs</SectionTitle>

            <View style={{ marginBottom: 16 }}>
              <View style={[s.input, { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
                <Search size={20} color={COLORS.textLight} />
                <TextInput
                  style={{ flex: 1, marginLeft: 8, color: COLORS.text }}
                  placeholder="Nom, email, compte ou CIN..."
                  placeholderTextColor={COLORS.textLight}
                  value={adminUserSearchQuery}
                  onChangeText={setAdminUserSearchQuery}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {['all', 'client', 'admin'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[s.filterChip, adminUserRoleFilter === role && s.filterChipActive]}
                    onPress={() => setAdminUserRoleFilter(role)}
                  >
                    <Text style={[s.filterChipText, adminUserRoleFilter === role && s.filterChipTextActive]}>
                      {role === 'all' ? 'Tous' : role === 'admin' ? 'Admins' : 'Clients'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <PrimaryButton label="Appliquer les filtres" onPress={() => loadAdminUsers()} disabled={isLoadingData} {...themed} />
            </View>

            {adminUsers.length === 0 ? (
              <EmptyState icon="👥" title="Aucun utilisateur" description="Aucun utilisateur ne correspond aux criteres." {...themed} />
            ) : adminUsers.map((item) => {
              const nextRole = item.role === 'admin' ? 'client' : 'admin';
              const isSelf = Number(item.id) === Number(user?.id);
              return (
                <View style={s.listItem} key={item.id}>
                  <View style={s.listItemHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listItemTitle}>{item.fullName || 'Utilisateur'}</Text>
                      <Text style={s.listItemSub}>{item.email}</Text>
                    </View>
                    <View style={[s.roleBadge, item.role === 'admin' ? s.roleBadgeAdmin : s.roleBadgeClient]}>
                      <Text style={[s.roleBadgeText, item.role === 'admin' ? s.roleBadgeTextAdmin : s.roleBadgeTextClient]}>
                        {item.role === 'admin' ? 'Admin' : 'Client'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.listItemSub}>
                    Compte: {item.accountNumber || '-'} • CIN: {item.cin || '-'} • Email {item.emailVerified ? 'verifie' : 'non verifie'}
                  </Text>
                  <Text style={s.listItemSub}>
                    Solde: {formatMoney(item.balance)} • Salaire: {formatMoney(item.salary)}
                  </Text>
                  <View style={s.adminActions}>
                    <TouchableOpacity
                      style={[s.adminBtn, { backgroundColor: isSelf && nextRole === 'client' ? COLORS.textLight : COLORS.primary }]}
                      onPress={() => onUpdateUserRole(item.id, nextRole)}
                      disabled={isActionBusy || (isSelf && nextRole === 'client')}
                    >
                      <Text style={s.adminBtnText}>{nextRole === 'admin' ? 'Promouvoir admin' : 'Passer client'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
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

              <InputLabel {...themed}>Type de compte</InputLabel>
              <View style={[s.langRow, { marginBottom: 16 }]}>
                {['particulier', 'professionnel'].map((type) => (
                  <Pressable key={type} style={[s.langChip, profileAccountType === type && s.langChipActive]} onPress={() => setProfileAccountType(type)}>
                    <Text style={[s.langChipText, profileAccountType === type && s.langChipTextActive]}>
                      {type === 'particulier' ? 'Particulier' : 'Professionnel'}
                    </Text>
                  </Pressable>
                ))}
              </View>

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
              <Text style={s.formHint}>CIN, fiche de paie, selfie ou autre justificatif — formats image ou PDF.</Text>

              <Text style={s.docSectionLabel}>Type de document</Text>
              <View style={s.docTypeGrid}>
                {DOC_TYPES.map(({ id, label, hint, Icon }) => {
                  const active = docType === id;
                  return (
                    <Pressable
                      key={id}
                      style={[s.docTypeCard, active && s.docTypeCardActive]}
                      onPress={() => setDocType(id)}
                    >
                      <View style={[s.docTypeIconWrap, active && { backgroundColor: COLORS.primary }]}>
                        <Icon size={20} color={active ? COLORS.white : COLORS.primary} />
                      </View>
                      <Text style={[s.docTypeCardTitle, active && { color: COLORS.primary }]}>{label}</Text>
                      <Text style={s.docTypeCardHint}>{hint}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={[s.docUploadCard, docDraft && s.docUploadCardReady]} onPress={onPickDocument}>
                {docDraft && isImageMime(docDraft.mimeType) ? (
                  <Image source={{ uri: docDraft.dataUrl }} style={s.docPreviewImg} resizeMode="cover" />
                ) : docDraft ? (
                  <View style={s.docPreviewFile}>
                    <FileText size={36} color={COLORS.primary} />
                    <Text style={s.docPreviewFileName} numberOfLines={2}>{docDraft.fileName}</Text>
                  </View>
                ) : (
                  <View style={s.docUploadPlaceholder}>
                    <Upload size={28} color={COLORS.primary} />
                    <Text style={s.docUploadTitle}>
                      {Platform.OS === 'web' ? 'Cliquez pour choisir un fichier' : 'Appuyez pour ouvrir la galerie'}
                    </Text>
                    <Text style={s.docUploadSub}>JPG, PNG ou PDF — max ~650 Ko</Text>
                  </View>
                )}
              </Pressable>

              {docDraft ? (
                <View style={s.docDraftMeta}>
                  <Text style={s.docDraftName} numberOfLines={1}>{docDraft.fileName}</Text>
                  <Pressable onPress={() => setDocDraft(null)} hitSlop={8}>
                    <Text style={s.docDraftClear}>Retirer</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={s.docActions}>
                <SecondaryButton
                  label={Platform.OS === 'web' ? 'Choisir un fichier' : 'Choisir un document'}
                  onPress={onPickDocument}
                  disabled={isUploadingDoc}
                  {...themed}
                />
                <PrimaryButton
                  label="Envoyer le document"
                  onPress={onUploadDocument}
                  disabled={!docDraft || isUploadingDoc}
                  loading={isUploadingDoc}
                  {...themed}
                />
              </View>

              <Text style={s.docSectionLabel}>Mes documents ({documents.length})</Text>
              {documents.length === 0 ? (
                <EmptyState icon="📄" title="Aucun document" description="Ajoutez votre CIN, fiche de paie ou selfie." {...themed} />
              ) : documents.map((doc) => {
                const meta = docTypeMeta(doc.type);
                const DocIcon = meta.Icon;
                return (
                  <View key={doc.id} style={s.docFileCard}>
                    <View style={s.docFileThumb}>
                      {isImageMime(doc.mimeType) && doc.dataUrl ? (
                        <Image source={{ uri: doc.dataUrl }} style={s.docFileThumbImg} resizeMode="cover" />
                      ) : (
                        <View style={s.docFileThumbPlaceholder}>
                          <DocIcon size={22} color={COLORS.primary} />
                        </View>
                      )}
                    </View>
                    <View style={s.docFileBody}>
                      <View style={s.listItemHead}>
                        <Text style={s.docFileTitle} numberOfLines={1}>{meta.label}</Text>
                        <StatusBadge status={doc.status} {...themed} />
                      </View>
                      <Text style={s.listItemSub} numberOfLines={1}>{doc.fileName}</Text>
                      <Text style={s.formMeta}>{doc.mimeType}</Text>
                    </View>
                    <Pressable style={s.docDeleteBtn} onPress={() => onDeleteDocument(doc.id)} hitSlop={8}>
                      <Trash2 size={18} color={COLORS.error} />
                    </Pressable>
                  </View>
                );
              })}
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
                    <SectionTitle {...themed}>
                      {adminSelectedRequest.applicationForm.formType === 'atb_particuliers_v3' ? 'Formulaire ATB (DCRT/03-2016/V3)' : 'Formulaire client'}
                    </SectionTitle>
                    <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Téléphone</Text><Text style={s.resultValue}>{String(adminSelectedRequest.applicationForm.phone || adminSelectedRequest.applicationForm.applicant1?.phone || '—')}</Text></View>
                    <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Ville / adresse</Text><Text style={[s.resultValue, { flex: 1.2, textAlign: 'right' }]}>{String(adminSelectedRequest.applicationForm.city || adminSelectedRequest.applicationForm.applicant1?.address || '—')}</Text></View>
                    <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Profession</Text><Text style={[s.resultValue, { flex: 1.2, textAlign: 'right' }]}>{String(adminSelectedRequest.applicationForm.profession || professionalStatusLabel(adminSelectedRequest.applicationForm.applicant1?.professionalStatus) || '—')}</Text></View>
                    {adminSelectedRequest.applicationForm.applicant1?.idNumber ? (
                      <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>CIN / pièce</Text><Text style={s.resultValue}>{String(adminSelectedRequest.applicationForm.applicant1.idNumber)}</Text></View>
                    ) : null}
                    <View style={[s.resultRow, { marginBottom: 4, alignItems: 'flex-start' }]}><Text style={s.resultLabel}>Objet crédit</Text><Text style={[s.resultValue, { flex: 1, textAlign: 'right', flexWrap: 'wrap' }]}>{String(adminSelectedRequest.applicationForm.projectPurpose || adminSelectedRequest.applicationForm.credit?.purpose || '—')}</Text></View>
                    <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Garanties</Text><Text style={[s.resultValue, { flex: 1.2, textAlign: 'right' }]}>{String(adminSelectedRequest.applicationForm.credit?.guarantees || '—')}</Text></View>
                    <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Autres revenus / mois</Text><Text style={s.resultValue}>{formatMoney(adminSelectedRequest.applicationForm.monthlyOtherIncome || adminSelectedRequest.applicationForm.applicant1?.otherIncomeAmount || 0)}</Text></View>
                    {adminSelectedRequest.applicationForm.applicant2 ? (
                      <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Co-demandeur</Text><Text style={s.resultValue}>{String(adminSelectedRequest.applicationForm.applicant2.fullName || '—')}</Text></View>
                    ) : null}
                    {adminSelectedRequest.applicationForm.spouse ? (
                      <View style={[s.resultRow, { marginBottom: 4 }]}><Text style={s.resultLabel}>Conjoint</Text><Text style={s.resultValue}>{String(adminSelectedRequest.applicationForm.spouse.fullName || '—')}</Text></View>
                    ) : null}
                    {adminSelectedRequest.applicationForm.additionalNotes ? (
                      <View style={[s.resultRow, { marginBottom: 16, alignItems: 'flex-start' }]}><Text style={s.resultLabel}>Remarques</Text><Text style={[s.resultValue, { flex: 1, textAlign: 'right' }]}>{String(adminSelectedRequest.applicationForm.additionalNotes)}</Text></View>
                    ) : (
                      <View style={{ marginBottom: 16 }} />
                    )}
                  </>
                ) : null}

                <SectionTitle {...themed}>Documents client (CIN, fiche de paie…)</SectionTitle>
                {adminDocsLoading ? (
                  <View style={s.loadingBox}><ActivityIndicator color={COLORS.primary} /><Text style={s.loadingText}>Chargement des documents…</Text></View>
                ) : adminRequestDocuments.length === 0 ? (
                  <Text style={[s.formHint, { marginBottom: 16 }]}>Aucun document joint à ce dossier.</Text>
                ) : adminRequestDocuments.map((doc) => {
                  const meta = docTypeMeta(doc.type);
                  const DocIcon = meta.Icon;
                  return (
                    <View key={doc.id} style={[s.docFileCard, { marginBottom: 10, flexDirection: 'column', alignItems: 'stretch' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                        <View style={s.docFileThumb}>
                          {isImageMime(doc.mimeType) && doc.dataUrl ? (
                            <Image source={{ uri: doc.dataUrl }} style={s.docFileThumbImg} resizeMode="cover" />
                          ) : (
                            <View style={s.docFileThumbPlaceholder}>
                              <DocIcon size={22} color={COLORS.primary} />
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={s.listItemHead}>
                            <Text style={s.docFileTitle}>{meta.label}</Text>
                            <StatusBadge status={doc.status} {...themed} />
                          </View>
                          <Text style={s.listItemSub} numberOfLines={1}>{doc.fileName}</Text>
                          <Text style={s.formMeta}>{doc.mimeType}</Text>
                        </View>
                      </View>
                      {isImageMime(doc.mimeType) && doc.dataUrl ? (
                        <Image source={{ uri: doc.dataUrl }} style={s.adminDocPreview} resizeMode="contain" />
                      ) : doc.dataUrl && doc.mimeType === 'application/pdf' ? (
                        <Text style={s.formHint}>PDF enregistré — ouvrir depuis le fichier client si besoin.</Text>
                      ) : null}
                    </View>
                  );
                })}

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
  const SHADOW = createShadows(COLORS);
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  // Splash
  splash: { flex: 1 },
  splashGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashLogo: { width: 84, height: 84, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  splashTitle: { fontFamily: FONTS.extraBold, fontSize: 34, color: COLORS.white, letterSpacing: 2, textTransform: 'uppercase' },
  splashSub: { fontFamily: FONTS.medium, ...TYPO.body, color: 'rgba(255,255,255,0.72)', marginTop: 4 },
  // Auth
  authWrap: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xxl, gap: SPACING.xxl },
  authHeader: { alignItems: 'center', gap: 10 },
  authLogo: { width: 72, height: 72, borderRadius: RADIUS.lg },
  authTitle: { fontFamily: FONTS.extraBold, fontSize: 30, color: COLORS.secondary, letterSpacing: -0.5 },
  authSubtitle: { fontFamily: FONTS.medium, ...TYPO.small, color: COLORS.textSecondary },
  authCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    gap: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },
  authToggle: { flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 3, gap: 3, borderWidth: 1, borderColor: COLORS.borderLight },
  authToggleBtn: { flex: 1, borderRadius: RADIUS.sm, paddingVertical: 11, alignItems: 'center' },
  authToggleBtnActive: { backgroundColor: COLORS.primary, ...SHADOW.soft },
  authToggleText: { fontFamily: FONTS.semiBold, color: COLORS.textSecondary, ...TYPO.body },
  authToggleTextActive: { color: COLORS.white },
  rowInputs: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputFill,
    minHeight: 50,
  },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontFamily: FONTS.medium, ...TYPO.body, color: COLORS.text, minWidth: 0 },
  passwordReveal: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: COLORS.inputFill,
    color: COLORS.text,
    fontFamily: FONTS.medium,
    ...TYPO.body,
    minHeight: 50,
  },
  helper: { ...TYPO.caption, color: COLORS.textLight, fontFamily: FONTS.regular, textAlign: 'center' },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOW.soft,
  },
  headerCompact: { paddingHorizontal: SPACING.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerLogo: { width: 36, height: 36, borderRadius: RADIUS.sm },
  headerUserAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: COLORS.borderLight, backgroundColor: COLORS.surfaceAlt },
  headerGreet: { fontFamily: FONTS.medium, ...TYPO.caption, color: COLORS.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase' },
  headerName: { fontFamily: FONTS.bold, ...TYPO.subtitle, color: COLORS.text },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // Body
  body: { flex: 1 },
  bodyContent: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl, width: '100%', maxWidth: 980, alignSelf: 'center' },
  // Notices
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  noticeText: { color: COLORS.success, fontFamily: FONTS.semiBold, ...TYPO.small, flex: 1 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.errorBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  errorText: { color: COLORS.error, fontFamily: FONTS.semiBold, ...TYPO.small, flex: 1 },
  loadingBox: { alignItems: 'center', gap: 10, padding: SPACING.xxl },
  loadingText: { fontFamily: FONTS.semiBold, color: COLORS.primary, ...TYPO.small, letterSpacing: 0.3 },
  // Balance card
  balanceCard: { borderRadius: RADIUS.xl, padding: SPACING.xxl, overflow: 'hidden', ...SHADOW.elevated },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontFamily: FONTS.medium, ...TYPO.small, color: 'rgba(255,255,255,0.78)', letterSpacing: 0.5, textTransform: 'uppercase' },
  balanceAmount: { fontFamily: FONTS.extraBold, fontSize: 34, color: COLORS.white, marginTop: 10, letterSpacing: -0.5 },
  balanceBottom: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  balanceSalary: { fontFamily: FONTS.medium, ...TYPO.small, color: 'rgba(255,255,255,0.65)' },
  balanceDecor: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)' },
  balanceDecor2: { position: 'absolute', bottom: -60, left: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.04)' },
  // KPI
  kpiRow: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  // List items
  listItem: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: 6,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryMuted,
  },
  listItemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  listItemTitle: { fontFamily: FONTS.bold, color: COLORS.text, ...TYPO.body, flexShrink: 1 },
  listItemSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, ...TYPO.small },
  // Credit types
  creditFilters: { gap: 10, marginBottom: 4 },
  creditSearchInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creditSearchText: { flex: 1, fontFamily: FONTS.medium, ...TYPO.body, color: COLORS.text },
  creditType: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: 6,
    backgroundColor: COLORS.surface,
  },
  creditTypeActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted, borderWidth: 2 },
  rateTag: { backgroundColor: COLORS.primaryMuted, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.primary + '20' },
  rateTagText: { fontFamily: FONTS.bold, ...TYPO.small, color: COLORS.primary },
  checkMark: { position: 'absolute', top: 12, right: 12 },
  // Simulation
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  chipText: { fontFamily: FONTS.semiBold, ...TYPO.small, color: COLORS.primary },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceAlt,
  },
  presetChipText: { fontFamily: FONTS.semiBold, ...TYPO.small, color: COLORS.textSecondary },
  formHint: { fontFamily: FONTS.regular, ...TYPO.small, color: COLORS.textSecondary },
  formMuted: { fontFamily: FONTS.medium, ...TYPO.small, color: COLORS.warning, marginTop: -4 },
  formTextArea: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  formMeta: { fontFamily: FONTS.semiBold, ...TYPO.caption, color: COLORS.primary, letterSpacing: 0.3 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 6 },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.xs,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxLabel: { flex: 1, fontFamily: FONTS.medium, ...TYPO.small, color: COLORS.text },
  resultCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  resultTitle: { fontFamily: FONTS.bold, ...TYPO.subtitle, color: COLORS.text, marginBottom: 4 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  resultLabel: { fontFamily: FONTS.medium, ...TYPO.small, color: COLORS.textSecondary },
  resultValue: { fontFamily: FONTS.bold, ...TYPO.subtitle, color: COLORS.text },
  scoreWrap: { gap: 8, marginTop: 6 },
  scoreHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { fontFamily: FONTS.bold, ...TYPO.small },
  scoreTrack: { width: '100%', height: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.border, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: RADIUS.full },
  // Chat
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 },
  chatZone: { minHeight: 220, gap: 4, paddingVertical: 4 },
  chatInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: COLORS.inputFill,
    fontFamily: FONTS.medium,
    ...TYPO.body,
    color: COLORS.text,
  },
  chatSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.elevated,
  },
  proLead: { fontFamily: FONTS.regular, color: COLORS.textSecondary, ...TYPO.body },
  quickActionRow: { gap: SPACING.md, marginTop: SPACING.sm },
  // Admin layout + sidebar
  adminLayout: { flex: 1, flexDirection: 'row' },
  adminSidebarRail: {
    width: 232,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderLight,
    gap: 4,
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
  adminSidebarTitle: {
    fontFamily: FONTS.extraBold,
    ...TYPO.subtitle,
    color: COLORS.primaryDark,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  adminNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  adminNavBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, ...SHADOW.soft },
  adminNavBtnText: { fontFamily: FONTS.semiBold, ...TYPO.body, color: COLORS.text },
  adminNavBtnTextActive: { color: COLORS.white },
  adminDrawerRoot: { flex: 1, flexDirection: 'row' },
  adminDrawerScrim: { flex: 1, backgroundColor: COLORS.overlay },
  adminDrawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm, paddingHorizontal: SPACING.sm },
  profileAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, marginVertical: SPACING.lg },
  profileAvatarTouch: { borderRadius: RADIUS.full, overflow: 'hidden', borderWidth: 3, borderColor: COLORS.borderLight },
  profileAvatarImg: { width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.surfaceAlt },
  profileAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  profileEmail: { fontFamily: FONTS.medium, ...TYPO.body, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  adminGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  adminActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  adminBtn: { borderRadius: RADIUS.sm, paddingVertical: 9, paddingHorizontal: 14 },
  adminBtnText: { color: COLORS.white, fontFamily: FONTS.bold, ...TYPO.caption, letterSpacing: 0.3 },
  roleBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  roleBadgeAdmin: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary + '25' },
  roleBadgeClient: { backgroundColor: COLORS.successBg, borderColor: COLORS.success + '25' },
  roleBadgeText: { fontFamily: FONTS.bold, ...TYPO.caption, letterSpacing: 0.4, textTransform: 'uppercase' },
  roleBadgeTextAdmin: { color: COLORS.primary },
  roleBadgeTextClient: { color: COLORS.success },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalContent: {
    backgroundColor: COLORS.surface,
    width: '100%',
    maxWidth: 500,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.elevated,
  },
  modalContentCompact: { width: '100%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceAlt,
  },
  modalTitle: { fontFamily: FONTS.bold, ...TYPO.headline, color: COLORS.secondary, letterSpacing: -0.3 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontFamily: FONTS.medium, ...TYPO.small, color: COLORS.textLight },
  filterChipTextActive: { color: COLORS.white, fontFamily: FONTS.bold },
  // Notifications
  notifyBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  notifyBadgeText: { color: COLORS.white, fontSize: 10, fontFamily: FONTS.bold },
  notifyActions: { marginBottom: 10 },
  notifyItem: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: 6,
    backgroundColor: COLORS.surface,
  },
  notifyItemUnread: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  notifyItemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifyItemTitle: { fontFamily: FONTS.bold, color: COLORS.text, ...TYPO.body },
  notifyTypeTag: { fontFamily: FONTS.semiBold, ...TYPO.caption, color: COLORS.primary, letterSpacing: 0.4, textTransform: 'uppercase' },
  notifyItemText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, ...TYPO.small },
  notifyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  // Request progress
  requestProgressTrack: { width: '100%', height: 4, borderRadius: 2, backgroundColor: COLORS.borderLight, overflow: 'hidden', marginTop: 8 },
  requestProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  // Simulation actions
  simActionRow: { gap: SPACING.md, marginTop: SPACING.md },
  amortWrap: { marginTop: SPACING.md, gap: 8 },
  amortToggle: { paddingVertical: 8 },
  amortToggleText: { fontFamily: FONTS.semiBold, ...TYPO.small, color: COLORS.primary },
  amortTable: { gap: 6 },
  amortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  amortCell: { fontFamily: FONTS.medium, ...TYPO.caption, color: COLORS.text },
  // Settings
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontFamily: FONTS.semiBold, ...TYPO.body, color: COLORS.text },
  toggle: { width: 52, height: 28, borderRadius: 14, backgroundColor: COLORS.borderLight, padding: 3 },
  toggleOn: { backgroundColor: COLORS.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white, ...SHADOW.soft },
  toggleKnobOn: { alignSelf: 'flex-end' },
  langRow: { flexDirection: 'row', gap: 8 },
  langChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.surfaceAlt,
  },
  langChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  langChipText: { fontFamily: FONTS.semiBold, ...TYPO.small, color: COLORS.textSecondary },
  langChipTextActive: { color: COLORS.white },
  otpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  otpInput: { flex: 1, minWidth: 90 },
  docRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  docActions: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  simCompareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  compareBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  compareTitle: { fontFamily: FONTS.bold, ...TYPO.body, color: COLORS.text },
  profileStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  profileStatusLabel: { fontFamily: FONTS.semiBold, ...TYPO.small, color: COLORS.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  qrWrap: { alignItems: 'center', gap: SPACING.md, padding: SPACING.lg, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderLight },
  // Simulation — sélecteur type crédit
  creditTypeScroll: { gap: SPACING.sm, paddingVertical: 4, paddingRight: SPACING.sm },
  creditTypeChip: {
    width: 148,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    gap: 4,
  },
  creditTypeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  creditTypeChipText: { fontFamily: FONTS.semiBold, ...TYPO.small, color: COLORS.text },
  creditTypeChipTextActive: { color: COLORS.primary },
  creditTypeChipRate: { fontFamily: FONTS.bold, ...TYPO.caption, color: COLORS.textSecondary },
  estimateActionWrap: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  // Documents — cartes
  docSectionLabel: {
    fontFamily: FONTS.semiBold,
    ...TYPO.caption,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  docTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  docTypeCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceAlt,
    gap: 6,
  },
  docTypeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  docTypeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTypeCardTitle: { fontFamily: FONTS.bold, ...TYPO.body, color: COLORS.text },
  docTypeCardHint: { fontFamily: FONTS.regular, ...TYPO.caption, color: COLORS.textSecondary },
  docUploadCard: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    backgroundColor: COLORS.inputFill,
    marginTop: SPACING.sm,
  },
  docUploadCardReady: { borderStyle: 'solid', borderColor: COLORS.primary + '50', backgroundColor: COLORS.surface },
  docUploadPlaceholder: { alignItems: 'center', gap: 8, paddingVertical: SPACING.md },
  docUploadTitle: { fontFamily: FONTS.semiBold, ...TYPO.body, color: COLORS.text, textAlign: 'center' },
  docUploadSub: { fontFamily: FONTS.regular, ...TYPO.caption, color: COLORS.textSecondary, textAlign: 'center' },
  docPreviewImg: { width: '100%', height: 140, borderRadius: RADIUS.md },
  docPreviewFile: { alignItems: 'center', gap: 8, paddingVertical: SPACING.md },
  docPreviewFileName: { fontFamily: FONTS.medium, ...TYPO.small, color: COLORS.text, textAlign: 'center', maxWidth: 260 },
  docDraftMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm, gap: SPACING.sm },
  docDraftName: { flex: 1, fontFamily: FONTS.medium, ...TYPO.small, color: COLORS.text },
  docDraftClear: { fontFamily: FONTS.semiBold, ...TYPO.small, color: COLORS.error },
  docFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  docFileThumb: { width: 52, height: 52, borderRadius: RADIUS.sm, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt },
  docFileThumbImg: { width: '100%', height: '100%' },
  docFileThumbPlaceholder: { flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  docFileBody: { flex: 1, gap: 2, minWidth: 0 },
  docFileTitle: { fontFamily: FONTS.bold, ...TYPO.body, color: COLORS.text, flex: 1 },
  docDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.error + '25',
  },
  adminDocPreview: {
    width: '100%',
    height: 200,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
  },
  });
}
