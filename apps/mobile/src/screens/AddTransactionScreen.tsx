import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../design-system/theme/ThemeProvider';
import { useFinanceStore } from '../store/financeStore';
import { getAllAccounts, updateAccountBalances } from '../storage/repositories/accountRepository';
import { getAllCategories } from '../storage/repositories/categoryRepository';
import { insertTransactionAndBalance, insertLinkedTransactions } from '../storage/repositories/transactionRepository';
import {
  getTransactionTypesForAccount,
  computeBalanceDelta,
  isIncomeType,
  isExpenseType,
  isTransferType,
  isInvestmentType,
} from '@finance/engine';
import type { Account, Category, Transaction, TransactionType, AccountType } from '@finance/engine';

type StackParamList = {
  Main: undefined;
  AddTransaction: undefined;
};

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getCategoryFilterType(txType: TransactionType): string {
  if (isIncomeType(txType)) return 'income';
  if (isExpenseType(txType)) return 'expense';
  if (isTransferType(txType)) return 'transfer';
  if (isInvestmentType(txType)) return 'investment';
  return 'expense';
}

function getColorForKey(colorKey: string, colors: any): string {
  switch (colorKey) {
    case 'danger': return colors.danger;
    case 'success': return colors.success;
    case 'info': return colors.info;
    case 'warning': return colors.warning;
    default: return colors.primary;
  }
}

function getAmountPreviewColor(txType: TransactionType, accountType: AccountType, colors: any): string {
  if (isIncomeType(txType)) return colors.success;
  if (txType === 'redemption') return colors.success;
  if (txType === 'fd_mature') return colors.success;
  if (isExpenseType(txType)) return colors.danger;
  if (txType === 'investment') return colors.danger;
  if (txType === 'fd_create') return colors.danger;
  if (txType === 'transfer') {
    if (accountType === 'credit_card') return colors.success;
    return colors.danger;
  }
  return colors.text;
}

function getAmountPrefix(txType: TransactionType, accountType: AccountType): string {
  if (isIncomeType(txType)) return '+';
  if (txType === 'redemption') return '+';
  if (txType === 'fd_mature') return '+';
  if (txType === 'transfer' && accountType === 'credit_card') return '-';
  if (isExpenseType(txType)) return '-';
  if (txType === 'investment') return '-';
  if (txType === 'fd_create') return '-';
  if (txType === 'transfer') return '-';
  return '';
}

export function AddTransactionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();
  const addTransaction = useFinanceStore(s => s.addTransaction);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  const [counterpartAccountId, setCounterpartAccountId] = useState('');
  const [units, setUnits] = useState('');
  const [navOrPrice, setNavOrPrice] = useState('');
  const [fdRate, setFdRate] = useState('');
  const [fdMaturityDate, setFdMaturityDate] = useState('');
  const [emiTenure, setEmiTenure] = useState('');
  const [interestRate, setInterestRate] = useState('');

  useEffect(() => {
    (async () => {
      const [accts, cats] = await Promise.all([getAllAccounts(), getAllCategories()]);
      setAccounts(accts);
      setCategories(cats);
      if (accts[0]) setSelectedAccountId(accts[0].id);
      const expenseCats = cats.filter(c => c.type === 'expense');
      if (expenseCats[0]) setSelectedCategoryId(expenseCats[0].id);
    })();
  }, []);

  const account = useMemo(
    () => accounts.find(a => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const typeOptions = useMemo(
    () => account ? getTransactionTypesForAccount(account.type) : [],
    [account]
  );

  useEffect(() => {
    if (typeOptions[0]) {
      const valid = typeOptions.find(t => t.type === txType);
      if (!valid) {
        setTxType(typeOptions[0].type);
      }
    }
  }, [typeOptions]);

  const filteredCategories = useMemo(() => {
    const catType = getCategoryFilterType(txType);
    return categories.filter(c => c.type === catType);
  }, [categories, txType]);

  const counterpartAccounts = useMemo(() => {
    const current = typeOptions.find(t => t.type === txType);
    if (!current?.requiresCounterpart || !current.counterpartFilter) return [];
    return accounts.filter(a =>
      a.id !== selectedAccountId &&
      current.counterpartFilter!.includes(a.type)
    );
  }, [accounts, selectedAccountId, txType, typeOptions]);

  const selectedTypeOption = useMemo(
    () => typeOptions.find(t => t.type === txType),
    [typeOptions, txType]
  );

  const showCounterpart = selectedTypeOption?.requiresCounterpart && counterpartAccounts.length > 0;
  const showInvestmentFields = selectedTypeOption?.fields?.includes('units') || false;
  const showFDFields = selectedTypeOption?.fields?.includes('fdRate') || false;
  const showEMIFields = selectedTypeOption?.fields?.includes('emiTenure') || false;
  const showInterestFields = selectedTypeOption?.fields?.includes('interestRate') || false;

  const handleTypeChange = useCallback((newType: TransactionType) => {
    setTxType(newType);
    const catType = getCategoryFilterType(newType);
    const cats = categories.filter(c => c.type === catType);
    if (cats[0]) setSelectedCategoryId(cats[0].id);
    else setSelectedCategoryId('');
    setCounterpartAccountId('');
    setUnits('');
    setNavOrPrice('');
    setFdRate('');
    setFdMaturityDate('');
    setEmiTenure('');
    setInterestRate('');
  }, [categories]);

  const handleAmountChange = useCallback((val: string) => {
    setAmount(val);
    if (showInvestmentFields && navOrPrice) {
      const amt = parseFloat(val);
      const nav = parseFloat(navOrPrice);
      if (amt > 0 && nav > 0) {
        setUnits((amt / nav).toFixed(4));
      }
    }
  }, [showInvestmentFields, navOrPrice]);

  const handleNavChange = useCallback((val: string) => {
    setNavOrPrice(val);
    if (amount) {
      const amt = parseFloat(amount);
      const nav = parseFloat(val);
      if (amt > 0 && nav > 0) {
        setUnits((amt / nav).toFixed(4));
      }
    }
  }, [amount]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    const amountNum = parseFloat(amount);

    if (!selectedAccountId) errors.push('Select an account');
    if (!txType) errors.push('Select a transaction type');
    if (!amount || isNaN(amountNum) || amountNum <= 0) errors.push('Enter a valid amount');
    if (!date) errors.push('Enter a date');
    if (!selectedCategoryId && !showFDFields) errors.push('Select a category');

    if (showCounterpart && !counterpartAccountId) {
      errors.push('Select a source account');
    }

    if (showInvestmentFields) {
      const nav = parseFloat(navOrPrice);
      if (!navOrPrice || isNaN(nav) || nav <= 0) errors.push('Enter a valid NAV');
    }

    if (showFDFields) {
      const rate = parseFloat(fdRate);
      if (!fdRate || isNaN(rate) || rate <= 0) errors.push('Enter FD interest rate');
      if (!fdMaturityDate) errors.push('Enter maturity date');
    }

    if (showEMIFields) {
      const tenure = parseInt(emiTenure, 10);
      if (!emiTenure || isNaN(tenure) || tenure <= 0) errors.push('Enter EMI tenure');
    }

    return errors;
  }, [selectedAccountId, txType, amount, date, selectedCategoryId, counterpartAccountId,
      showCounterpart, showInvestmentFields, navOrPrice, showFDFields, fdRate, fdMaturityDate,
      showEMIFields, emiTenure]);

  const previewAmount = useMemo(() => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return null;
    return amountNum;
  }, [amount]);

  const handleSave = useCallback(async () => {
    if (validation.length > 0) {
      Alert.alert('Validation Error', validation[0]);
      return;
    }

    const amountNum = parseFloat(amount);
    const amountPaise = Math.round(amountNum * 100);
    const now = new Date().toISOString();

    setSaving(true);
    try {
      const primaryTx: Transaction = {
        id: generateId(),
        accountId: selectedAccountId,
        amount: amountPaise,
        currency: 'INR',
        type: txType,
        date,
        categoryId: selectedCategoryId || 'uncategorized',
        description: description || `${txType} on ${date}`,
        merchant: merchant || undefined,
        counterpartAccountId: showCounterpart ? counterpartAccountId : undefined,
        status: 'cleared',
        isRecurring: false,
        isTaxRelevant: false,
        tags: [],
        units: showInvestmentFields && units ? parseFloat(units) : undefined,
        navOrPrice: showInvestmentFields && navOrPrice ? parseFloat(navOrPrice) : undefined,
        emiTenure: showEMIFields && emiTenure ? parseInt(emiTenure, 10) : undefined,
        fdRate: showFDFields && fdRate ? parseFloat(fdRate) : undefined,
        fdMaturityDate: showFDFields ? fdMaturityDate : undefined,
        interestRate: showInterestFields && interestRate ? parseFloat(interestRate) : undefined,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      const sourceAccountType = account?.type as AccountType;
      const sourceDelta = computeBalanceDelta(sourceAccountType, txType, amountPaise, 'outgoing');

      if (showCounterpart && counterpartAccountId) {
        const counterAccount = accounts.find(a => a.id === counterpartAccountId);
        const counterAccountType = counterAccount?.type as AccountType;
        const counterDelta = computeBalanceDelta(counterAccountType, txType, amountPaise, 'incoming');

        const counterTx: Transaction = {
          ...primaryTx,
          id: generateId(),
          accountId: counterpartAccountId,
          counterpartAccountId: selectedAccountId,
          amount: amountPaise,
        };

        await insertLinkedTransactions(primaryTx, counterTx);
        await updateAccountBalances([
          { accountId: selectedAccountId, delta: sourceDelta },
          { accountId: counterpartAccountId, delta: counterDelta },
        ]);

        addTransaction(primaryTx, sourceDelta, counterpartAccountId, counterDelta);
      } else {
        await insertTransactionAndBalance(primaryTx, sourceDelta);
        addTransaction(primaryTx, sourceDelta);
      }
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [amount, txType, selectedAccountId, date, selectedCategoryId, description, merchant,
      counterpartAccountId, units, navOrPrice, emiTenure, fdRate, fdMaturityDate, interestRate,
      showCounterpart, showInvestmentFields, showFDFields, showEMIFields, showInterestFields,
      validation, account, accounts, addTransaction, navigation]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: theme.colors.danger }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add Transaction</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving || validation.length > 0}
          style={styles.headerBtn}
        >
          <Text style={[styles.headerBtnText, {
            color: saving || validation.length > 0 ? theme.colors.textTertiary : theme.colors.primary,
          }]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Account</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {accounts.map(a => (
            <Pressable
              key={a.id}
              onPress={() => {
                setSelectedAccountId(a.id);
                setCounterpartAccountId('');
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedAccountId === a.id ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderColor: selectedAccountId === a.id ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text style={styles.chipIcon}>{a.icon}</Text>
              <Text style={{
                color: selectedAccountId === a.id ? '#FFFFFF' : theme.colors.text,
                fontSize: 13, fontWeight: '600',
              }} numberOfLines={1}>
                {a.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 20 }]}>Type</Text>
        <View style={styles.typeRow}>
          {typeOptions.map(opt => {
            const color = getColorForKey(opt.colorKey, theme.colors);
            const isActive = txType === opt.type;
            return (
              <Pressable
                key={opt.type}
                onPress={() => handleTypeChange(opt.type)}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: isActive ? color + '18' : theme.colors.surfaceVariant,
                    borderColor: isActive ? color : theme.colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 16, marginRight: 4 }}>{opt.icon}</Text>
                <Text style={{
                  color: isActive ? color : theme.colors.textSecondary,
                  fontWeight: '700', fontSize: 13,
                }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 20 }]}>Amount (₹)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="0.00"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={handleAmountChange}
        />

        {showInvestmentFields && (
          <>
            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>NAV / Unit Price (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="decimal-pad"
              value={navOrPrice}
              onChangeText={handleNavChange}
            />
            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Units</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Auto-calculated"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="decimal-pad"
              value={units}
              onChangeText={setUnits}
            />
          </>
        )}

        {showFDFields && (
          <>
            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Interest Rate (%)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="e.g. 7.75"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="decimal-pad"
              value={fdRate}
              onChangeText={setFdRate}
            />
            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Maturity Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="2027-09-14"
              placeholderTextColor={theme.colors.textTertiary}
              value={fdMaturityDate}
              onChangeText={setFdMaturityDate}
            />
          </>
        )}

        {showEMIFields && (
          <>
            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>EMI Tenure (months)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="e.g. 6"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="number-pad"
              value={emiTenure}
              onChangeText={setEmiTenure}
            />
            {emiTenure && amount && (
              <View style={[styles.previewCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border, marginTop: 8 }]}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                  Monthly EMI: ₹{(parseFloat(amount) / parseInt(emiTenure, 10)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            )}
          </>
        )}

        {showInterestFields && (
          <>
            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Interest Rate (% p.a.) — optional</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="e.g. 6.5"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="decimal-pad"
              value={interestRate}
              onChangeText={setInterestRate}
            />
          </>
        )}

        <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Date</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {[
            { label: 'Today', value: new Date().toISOString().slice(0, 10) },
            { label: 'Yesterday', value: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
            { label: '2 days ago', value: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) },
          ].map(opt => (
            <Pressable
              key={opt.value}
              onPress={() => setDate(opt.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: date === opt.value ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderColor: date === opt.value ? theme.colors.primary : theme.colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                },
              ]}
            >
              <Text style={{
                color: date === opt.value ? '#FFFFFF' : theme.colors.textSecondary,
                fontSize: 12, fontWeight: '600',
              }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textTertiary}
          value={date}
          onChangeText={setDate}
        />

        <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {filteredCategories.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategoryId(cat.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedCategoryId === cat.id ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderColor: selectedCategoryId === cat.id ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text style={styles.chipIcon}>{cat.icon}</Text>
              <Text style={{
                color: selectedCategoryId === cat.id ? '#FFFFFF' : theme.colors.text,
                fontSize: 13, fontWeight: '600',
              }} numberOfLines={1}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {showCounterpart && (
          <>
            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>
              {txType === 'transfer' && account?.type === 'credit_card' ? 'Pay from account' : 'Counterpart account'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {counterpartAccounts.map(a => (
                <Pressable
                  key={a.id}
                  onPress={() => setCounterpartAccountId(a.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: counterpartAccountId === a.id ? theme.colors.primary : theme.colors.surfaceVariant,
                      borderColor: counterpartAccountId === a.id ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text style={styles.chipIcon}>{a.icon}</Text>
                  <View>
                    <Text style={{
                      color: counterpartAccountId === a.id ? '#FFFFFF' : theme.colors.text,
                      fontSize: 13, fontWeight: '600',
                    }} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={{
                      color: counterpartAccountId === a.id ? '#FFFFFF' : theme.colors.textTertiary,
                      fontSize: 11,
                    }}>
                      ₹{a.balance.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Description</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="What was this transaction for?"
          placeholderTextColor={theme.colors.textTertiary}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Merchant (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="e.g. Swiggy, Amazon"
          placeholderTextColor={theme.colors.textTertiary}
          value={merchant}
          onChangeText={setMerchant}
        />

        {previewAmount !== null && account && (
          <View style={[styles.previewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>Preview</Text>
            <View style={styles.previewRow}>
              <Text style={{ fontSize: 20 }}>{account.icon}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.previewDesc, { color: theme.colors.text }]} numberOfLines={1}>
                  {description || selectedTypeOption?.label || txType}
                </Text>
                <Text style={[styles.previewSub, { color: theme.colors.textTertiary }]}>
                  {account.name} · {date}
                </Text>
              </View>
              <Text style={[styles.previewAmount, {
                color: getAmountPreviewColor(txType, account.type, theme.colors),
              }]}>
                {getAmountPrefix(txType, account.type)}₹{previewAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            {showCounterpart && counterpartAccountId && (
              <View style={[styles.previewLinked, { borderTopColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>
                  ↔ {accounts.find(a => a.id === counterpartAccountId)?.name || 'Unknown'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 4 },
  headerBtnText: { fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipIcon: { fontSize: 16, marginRight: 6 },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewRow: { flexDirection: 'row', alignItems: 'center' },
  previewDesc: { fontSize: 14, fontWeight: '600' },
  previewSub: { fontSize: 12, marginTop: 2 },
  previewAmount: { fontSize: 17, fontWeight: '700' },
  previewLinked: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
});
