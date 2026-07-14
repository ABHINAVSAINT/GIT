import { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../design-system/theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { insertAccount } from '../storage/repositories/accountRepository';
import { importTransactionsForAccount } from '../services/csvImportService';
import type { AccountType } from '@finance/engine';
import { Account } from '@finance/engine';

const ACCOUNT_FLOW = [
  {
    key: 'savings',
    label: 'Savings Account',
    icon: '🏦',
    type: 'savings' as AccountType,
    question: 'Do you have a savings account?',
    subtitle: 'This is your primary account for saving money.',
    requiresCreditLimit: false,
    fields: ['name', 'institution', 'balance'] as const,
    nameLabel: 'Account Name',
    namePlaceholder: 'e.g., HDFC Savings',
    allowMultiple: true,
  },
  {
    key: 'checking',
    label: 'Current Account',
    icon: '💰',
    type: 'checking' as AccountType,
    question: 'Do you have a current account?',
    subtitle: 'For daily transactions and salary deposits.',
    requiresCreditLimit: false,
    fields: ['name', 'institution', 'balance'] as const,
    nameLabel: 'Account Name',
    namePlaceholder: 'e.g., Kotak Current',
    allowMultiple: true,
  },
  {
    key: 'credit_card',
    label: 'Credit Card',
    icon: '💳',
    type: 'credit_card' as AccountType,
    question: 'Do you have a credit card?',
    subtitle: 'Track spending, repayments, and credit limits.',
    requiresCreditLimit: true,
    fields: ['name', 'balance', 'creditLimit'] as const,
    nameLabel: 'Card Name',
    namePlaceholder: 'e.g., Axis Flipkart',
    balanceLabel: 'Outstanding Balance (₹)',
    balancePlaceholder: '0.00',
    allowMultiple: true,
  },
  {
    key: 'emi_card',
    label: 'EMI Card',
    icon: '🛍️',
    type: 'emi_card' as AccountType,
    question: 'Do you have an EMI card?',
    subtitle: 'Track EMI purchases and monthly payments.',
    requiresCreditLimit: false,
    fields: ['name', 'balance', 'emiTenure'] as const,
    nameLabel: 'Card Name',
    namePlaceholder: 'e.g., Bajaj Finserv',
    balanceLabel: 'Outstanding EMI Amount (₹)',
    balancePlaceholder: '0.00',
    allowMultiple: true,
  },
  {
    key: 'fixed_deposit',
    label: 'Fixed Deposit',
    icon: '🏛️',
    type: 'fixed_deposit' as AccountType,
    question: 'Do you have fixed deposits?',
    subtitle: 'Track maturity dates, interest rates, and returns.',
    requiresCreditLimit: false,
    fields: ['name', 'balance', 'fdRate', 'fdMaturityDate'] as const,
    nameLabel: 'FD Name',
    namePlaceholder: 'e.g., HDFC FD',
    balanceLabel: 'Principal Amount (₹)',
    balancePlaceholder: '0.00',
    allowMultiple: true,
  },
  {
    key: 'investment',
    label: 'Investment Account',
    icon: '📈',
    type: 'investment' as AccountType,
    question: 'Do you have investment accounts?',
    subtitle: 'Mutual funds, stocks, ETFs, FDs, etc.',
    requiresCreditLimit: false,
    fields: ['name', 'investmentMode', 'balance'] as const,
    nameLabel: 'Investment Name',
    namePlaceholder: 'e.g., HDFC Midcap Fund',
    balanceLabel: 'Amount (₹)',
    balancePlaceholder: '0.00',
    allowMultiple: true,
  },
  {
    key: 'cash',
    label: 'Cash',
    icon: '💵',
    type: 'cash' as AccountType,
    question: 'Do you track cash on hand?',
    subtitle: 'Physical cash you carry or keep at home.',
    requiresCreditLimit: false,
    fields: ['location', 'balance'] as const,
    defaultName: 'Cash',
    allowMultiple: false,
  },
  {
    key: 'other',
    label: 'Other Account',
    icon: '📋',
    type: 'other' as AccountType,
    question: 'Do you have any other accounts?',
    subtitle: 'Loans, crypto, gold, family accounts, or any other financial accounts.',
    requiresCreditLimit: false,
    fields: ['name', 'subType', 'balance'] as const,
    nameLabel: 'Account Name',
    namePlaceholder: 'e.g., Bajaj EMI Card',
    allowMultiple: true,
  },
];

const ACCOUNT_COLORS = [
  '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

const CASH_LOCATIONS = ['Home', 'Office', 'Wallet', 'Locker', 'Other'];
const OTHER_SUBTYPES = ['No-cost EMI', 'Interest EMI', 'Loan', 'Crypto', 'Gold', 'Family Account', 'Other'];

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type FlowKey = (typeof ACCOUNT_FLOW)[number]['key'];
type OnboardingStep =
  | 'welcome'
  | `ask_${FlowKey}`
  | `add_${FlowKey}`
  | 'complete';

export function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [addedAccounts, setAddedAccounts] = useState<Account[]>([]);
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'savings' as AccountType,
    balance: '',
    color: ACCOUNT_COLORS[0] ?? '#0EA5E9',
    creditLimit: '',
    institution: '',
    investmentMode: 'sip' as 'sip' | 'onetime',
    location: CASH_LOCATIONS[0] ?? 'Home',
    subType: OTHER_SUBTYPES[0] ?? 'Other',
    emiTenure: '',
    fdRate: '',
    fdMaturityDate: '',
  });
  const [currentFlowIndex, setCurrentFlowIndex] = useState(0);
  const [accountsAddedForCurrentType, setAccountsAddedForCurrentType] = useState(0);
  const [formVersion, setFormVersion] = useState(0);
  const nameRef = useRef<any>(null);
  const bankRef = useRef<any>(null);
  const balanceRef = useRef<any>(null);
  const creditLimitRef = useRef<any>(null);

  const currentFlow = useMemo(() => ACCOUNT_FLOW[currentFlowIndex], [currentFlowIndex]);

  const handleNextFlowItem = useCallback(() => {
    if (currentFlowIndex < ACCOUNT_FLOW.length - 1) {
      const nextIndex = currentFlowIndex + 1;
      setCurrentFlowIndex(nextIndex);
      setAccountsAddedForCurrentType(0);
      setCurrentStep(`ask_${ACCOUNT_FLOW[nextIndex]?.key ?? 'savings'}`);
    } else {
      setCurrentStep('complete');
    }
  }, [currentFlowIndex]);

  const handleYesToQuestion = useCallback((flowKey: FlowKey) => {
    const flow = ACCOUNT_FLOW.find(f => f.key === flowKey);
    setAccountForm(prev => ({
      ...prev,
      name: flow?.defaultName ?? '',
      type: flow?.type ?? 'savings',
      balance: '',
      creditLimit: '',
      institution: '',
      investmentMode: 'sip',
      location: CASH_LOCATIONS[0] ?? 'Home',
      subType: OTHER_SUBTYPES[0] ?? 'Other',
      emiTenure: '',
      fdRate: '',
      fdMaturityDate: '',
    }));
    setAccountsAddedForCurrentType(0);
    setCurrentStep(`add_${flowKey}`);
  }, []);

  const handleNoToQuestion = useCallback(() => {
    handleNextFlowItem();
  }, [handleNextFlowItem]);

  const handleDoneWithType = useCallback(() => {
    handleNextFlowItem();
  }, [handleNextFlowItem]);

  const addCurrentAccount = useCallback(async () => {
    if (!accountForm.name.trim() && currentFlow?.key !== 'cash') return;

    const balancePaise = Math.round((parseFloat(accountForm.balance) || 0) * 100);
    const creditLimitPaise = currentFlow?.requiresCreditLimit
      ? Math.round((parseFloat(accountForm.creditLimit) || 0) * 100)
      : undefined;

    const accountName = currentFlow?.key === 'cash'
      ? accountForm.location
      : accountForm.name.trim();

    const newAccount: Account = {
      id: uuid(),
      name: accountName,
      type: accountForm.type,
      currency: 'INR',
      balance: balancePaise,
      balanceAsOf: new Date().toISOString(),
      color: accountForm.color,
      icon: currentFlow?.icon ?? '📋',
      isHidden: false,
      isArchived: false,
      sortOrder: addedAccounts.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(currentFlow?.requiresCreditLimit && creditLimitPaise !== undefined && { creditLimit: creditLimitPaise }),
      ...(accountForm.institution.trim() && { institution: accountForm.institution.trim() }),
      ...(currentFlow?.key === 'investment' && { investmentMode: accountForm.investmentMode }),
      ...(currentFlow?.key === 'cash' && { location: accountForm.location }),
      ...(currentFlow?.key === 'other' && { subType: accountForm.subType }),
      ...(currentFlow?.key === 'emi_card' && accountForm.emiTenure && { emiTenure: parseInt(accountForm.emiTenure, 10) }),
      ...(currentFlow?.key === 'fixed_deposit' && accountForm.fdRate && { fdRate: parseFloat(accountForm.fdRate) }),
      ...(currentFlow?.key === 'fixed_deposit' && accountForm.fdMaturityDate && { fdMaturityDate: accountForm.fdMaturityDate }),
      ...(currentFlow?.key === 'fixed_deposit' && { fdStartDate: new Date().toISOString().split('T')[0] }),
    };

    const shouldAdvance = currentFlow?.allowMultiple === false;

    setAddedAccounts(prev => [...prev, newAccount]);
    setAccountsAddedForCurrentType(prev => prev + 1);
    setFormVersion(prev => prev + 1);
    setAccountForm({
      name: '',
      type: newAccount.type,
      balance: '',
      color: ACCOUNT_COLORS[0] ?? '#0EA5E9',
      creditLimit: '',
      institution: '',
      investmentMode: 'sip',
      location: CASH_LOCATIONS[0] ?? 'Home',
      subType: OTHER_SUBTYPES[0] ?? 'Other',
      emiTenure: '',
      fdRate: '',
      fdMaturityDate: '',
    });
    nameRef.current?.clear();
    bankRef.current?.clear();
    balanceRef.current?.clear();
    creditLimitRef.current?.clear();

    if (shouldAdvance) {
      setTimeout(() => handleNextFlowItem(), 500);
    }
  }, [accountForm.name, accountForm.balance, accountForm.creditLimit, accountForm.type, accountForm.color, accountForm.institution, accountForm.investmentMode, accountForm.location, accountForm.subType, accountForm.emiTenure, accountForm.fdRate, accountForm.fdMaturityDate, currentFlow, addedAccounts.length, handleNextFlowItem]);

  const handleFinishOnboarding = useCallback(async () => {
    for (const account of addedAccounts) {
      await insertAccount(account);
    }
    for (const account of addedAccounts) {
      try {
        await importTransactionsForAccount(account.name, account.id);
      } catch (error) {
        console.warn(`Failed to import transactions for ${account.name}:`, error);
      }
    }
    completeOnboarding();
  }, [addedAccounts, completeOnboarding]);

  const handleSkipOnboarding = useCallback(async () => {
    if (addedAccounts.length > 0) {
      for (const account of addedAccounts) {
        await insertAccount(account);
      }
      for (const account of addedAccounts) {
        try {
          await importTransactionsForAccount(account.name, account.id);
        } catch (error) {
          console.warn(`Failed to import transactions for ${account.name}:`, error);
        }
      }
    }
    completeOnboarding();
  }, [addedAccounts, completeOnboarding]);

  const getStepTitle = useCallback(() => {
    if (currentStep.startsWith('ask_')) return currentFlow?.question;
    if (currentStep.startsWith('add_')) return `Add ${currentFlow?.label}`;
    return '';
  }, [currentStep, currentFlow]);

  const getStepSubtitle = useCallback(() => {
    if (currentStep.startsWith('ask_')) return currentFlow?.subtitle;
    return '';
  }, [currentStep, currentFlow]);

  const isAddButtonDisabled = useMemo(() => {
    if (currentFlow?.key === 'cash') return false;
    if (currentFlow?.key === 'credit_card' && !accountForm.creditLimit.trim()) return true;
    return !accountForm.name.trim();
  }, [accountForm, currentFlow]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.text,
      borderColor: theme.colors.border,
    },
  ];

  const renderFormFields = () => {
    if (!currentFlow) return null;
    const fields = currentFlow.fields;

    return (
      <View key={`form-${formVersion}`}>
        {fields.map((field) => {
          switch (field) {
            case 'name':
              return (
                <View key="name" style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    {currentFlow.nameLabel ?? 'Account Name'}
                  </Text>
                  <TextInput
                    ref={nameRef}
                    key={`name-${formVersion}`}
                    style={inputStyle}
                    placeholder={currentFlow.namePlaceholder ?? 'Enter name'}
                    placeholderTextColor={theme.colors.textTertiary}
                    value={accountForm.name}
                    onChangeText={(text) => setAccountForm(prev => ({ ...prev, name: text }))}
                  />
                </View>
              );
            case 'institution':
              return (
                <View key="institution" style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    Bank Name
                  </Text>
                  <TextInput
                    ref={bankRef}
                    key={`inst-${formVersion}`}
                    style={inputStyle}
                    placeholder="e.g., HDFC, SBI, Kotak"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={accountForm.institution}
                    onChangeText={(text) => setAccountForm(prev => ({ ...prev, institution: text }))}
                  />
                </View>
              );
            case 'balance':
              return (
                <View key="balance" style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    {currentFlow.balanceLabel ?? 'Current Balance (₹)'}
                  </Text>
                  <TextInput
                    ref={balanceRef}
                    key={`bal-${formVersion}`}
                    style={inputStyle}
                    placeholder={currentFlow.balancePlaceholder ?? '0.00'}
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={accountForm.balance}
                    onChangeText={(text) => setAccountForm(prev => ({ ...prev, balance: text }))}
                  />
                </View>
              );
            case 'creditLimit':
              return (
                <View key="creditLimit" style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    Credit Limit (₹)
                  </Text>
                  <TextInput
                    ref={creditLimitRef}
                    key={`cl-${formVersion}`}
                    style={inputStyle}
                    placeholder="e.g., 50,000"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={accountForm.creditLimit}
                    onChangeText={(text) => setAccountForm(prev => ({ ...prev, creditLimit: text }))}
                  />
                </View>
              );
            case 'investmentMode':
              return (
                <View key="investmentMode" style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    Investment Type
                  </Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        {
                          backgroundColor: accountForm.investmentMode === 'sip' ? theme.colors.primary : theme.colors.surfaceVariant,
                          borderColor: accountForm.investmentMode === 'sip' ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setAccountForm(prev => ({ ...prev, investmentMode: 'sip' }))}
                    >
                      <Text style={[
                        styles.toggleText,
                        { color: accountForm.investmentMode === 'sip' ? '#FFFFFF' : theme.colors.text },
                      ]}>
                        SIP (Monthly)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        {
                          backgroundColor: accountForm.investmentMode === 'onetime' ? theme.colors.primary : theme.colors.surfaceVariant,
                          borderColor: accountForm.investmentMode === 'onetime' ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setAccountForm(prev => ({ ...prev, investmentMode: 'onetime' }))}
                    >
                      <Text style={[
                        styles.toggleText,
                        { color: accountForm.investmentMode === 'onetime' ? '#FFFFFF' : theme.colors.text },
                      ]}>
                        One-time
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            case 'location':
              return (
                <View key="location" style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    Where do you keep it?
                  </Text>
                  <View style={styles.chipRow}>
                    {CASH_LOCATIONS.map((loc) => (
                      <TouchableOpacity
                        key={loc}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: accountForm.location === loc ? theme.colors.primary : theme.colors.surfaceVariant,
                            borderColor: accountForm.location === loc ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                        onPress={() => setAccountForm(prev => ({ ...prev, location: loc }))}
                      >
                        <Text style={[
                          styles.chipText,
                          { color: accountForm.location === loc ? '#FFFFFF' : theme.colors.text },
                        ]}>
                          {loc}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            case 'subType':
              return (
                <View key="subType" style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    What type?
                  </Text>
                  <View style={styles.chipRow}>
                    {OTHER_SUBTYPES.map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: accountForm.subType === st ? theme.colors.primary : theme.colors.surfaceVariant,
                            borderColor: accountForm.subType === st ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                        onPress={() => setAccountForm(prev => ({ ...prev, subType: st }))}
                      >
                        <Text style={[
                          styles.chipText,
                          { color: accountForm.subType === st ? '#FFFFFF' : theme.colors.text },
                        ]}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            case 'emiTenure':
              return (
                <View key="emiTenure" style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    Default EMI Tenure (months)
                  </Text>
                  <TextInput
                    key={`emi-${formVersion}`}
                    style={inputStyle}
                    placeholder="e.g., 6, 12, 24"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                    value={accountForm.emiTenure}
                    onChangeText={(text) => setAccountForm(prev => ({ ...prev, emiTenure: text }))}
                  />
                </View>
              );
            case 'fdRate':
              return (
                <View key="fdRate" style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    Interest Rate (% p.a.)
                  </Text>
                  <TextInput
                    key={`fdrate-${formVersion}`}
                    style={inputStyle}
                    placeholder="e.g., 7.75"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={accountForm.fdRate}
                    onChangeText={(text) => setAccountForm(prev => ({ ...prev, fdRate: text }))}
                  />
                </View>
              );
            case 'fdMaturityDate':
              return (
                <View key="fdMaturityDate" style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    Maturity Date (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    key={`fdmat-${formVersion}`}
                    style={inputStyle}
                    placeholder="2027-09-14"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={accountForm.fdMaturityDate}
                    onChangeText={(text) => setAccountForm(prev => ({ ...prev, fdMaturityDate: text }))}
                  />
                </View>
              );
            default:
              return null;
          }
        })}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 'welcome' && (
          <View style={styles.stepContainer}>
            <Text style={[styles.emoji, { fontSize: 64 }]}>💰</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>Welcome to FinTrack</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Let's set up your financial accounts step by step.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setCurrentStep(`ask_${ACCOUNT_FLOW[0]?.key ?? 'savings'}`)}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkipOnboarding}>
              <Text style={[styles.skipButtonText, { color: theme.colors.textTertiary }]}>
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {currentStep.startsWith('ask_') && (
          <View style={styles.stepContainer}>
            <Text style={[styles.emoji, { fontSize: 50 }]}>{currentFlow?.icon}</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>{getStepTitle()}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{getStepSubtitle()}</Text>
            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: theme.colors.success }]}
                onPress={() => handleYesToQuestion(currentFlow!.key)}
              >
                <Text style={styles.secondaryButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: theme.colors.danger }]}
                onPress={handleNoToQuestion}
              >
                <Text style={styles.secondaryButtonText}>No</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkipOnboarding}>
              <Text style={[styles.skipButtonText, { color: theme.colors.textTertiary }]}>
                Skip this step
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {currentStep.startsWith('add_') && (
          <View key={`formSection-${formVersion}`} style={styles.stepContainer}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {accountsAddedForCurrentType > 0
                ? `Add Another ${currentFlow?.label} (${accountsAddedForCurrentType + 1})`
                : `Add ${currentFlow?.label}`}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {accountsAddedForCurrentType === 0
                ? `Enter your ${currentFlow?.label.toLowerCase().replace(' account', '')} details below.`
                : `Enter another ${currentFlow?.label.toLowerCase().replace(' account', '')} details.`}
            </Text>

            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Account Type</Text>
            <View style={styles.lockedTypeChip}>
              <Text style={styles.typeIcon}>{currentFlow?.icon}</Text>
              <Text style={styles.lockedTypeLabel}>{currentFlow?.label}</Text>
              <Text style={styles.lockedBadge}>Locked</Text>
            </View>

            {renderFormFields()}

            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Color</Text>
            <View style={styles.colorRow}>
              {ACCOUNT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    accountForm.color === color && styles.colorDotSelected,
                  ]}
                  onPress={() => setAccountForm(prev => ({ ...prev, color }))}
                />
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={addCurrentAccount}
                disabled={isAddButtonDisabled}
              >
                <Text style={styles.primaryButtonText}>
                  {currentFlow?.allowMultiple === false
                    ? `Add ${currentFlow?.label}`
                    : accountsAddedForCurrentType === 0
                      ? `Add ${currentFlow?.label}`
                      : `Add Another ${currentFlow?.label}`}
                </Text>
              </TouchableOpacity>
              {currentFlow?.allowMultiple !== false && accountsAddedForCurrentType > 0 && (
                <TouchableOpacity
                  style={[styles.finishButton, { backgroundColor: theme.colors.success }]}
                  onPress={handleDoneWithType}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>

            {currentFlow?.allowMultiple !== false && (
              <TouchableOpacity style={styles.skipButton} onPress={handleDoneWithType}>
                <Text style={[styles.skipButtonText, { color: theme.colors.textTertiary }]}>
                  Skip this type
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {currentStep === 'complete' && (
          <View style={styles.stepContainer}>
            <Text style={[styles.emoji, { fontSize: 64 }]}>🎉</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>You're All Set!</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {addedAccounts.length > 0
                ? `Added ${addedAccounts.length} account${addedAccounts.length !== 1 ? 's' : ''}. You can always add more in Settings.`
                : 'No accounts added yet. You can add them anytime in Settings.'}
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleFinishOnboarding}
            >
              <Text style={styles.primaryButtonText}>Start Using FinTrack</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  stepContainer: { alignItems: 'center', width: '100%' },
  emoji: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '500', alignSelf: 'flex-start', marginBottom: 8, marginTop: 16 },
  fieldContainer: { width: '100%', marginBottom: 4 },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  lockedTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    width: '100%',
  },
  typeIcon: { fontSize: 24, marginRight: 12 },
  lockedTypeLabel: { fontSize: 16, fontWeight: '600', color: '#334155', flex: 1 },
  lockedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  colorRow: { flexDirection: 'row', gap: 12, alignSelf: 'flex-start', marginBottom: 24 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonRow: { width: '100%', gap: 12, marginBottom: 12 },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  finishButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  skipButton: { padding: 16, marginTop: 20 },
  skipButtonText: { fontSize: 14 },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    marginBottom: 32,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 8,
  },
  toggleButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { fontSize: 14, fontWeight: '600' },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
});
