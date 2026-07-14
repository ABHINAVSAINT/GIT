import { Transaction, calculateCashback } from '@finance/engine';
import { insertTransaction } from '../storage/repositories/transactionRepository';
import { getAllCategories } from '../storage/repositories/categoryRepository';
import { updateAccountBalance } from '../storage/repositories/accountRepository';

export interface ParsedTransaction {
  accountId: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer' | 'investment' | 'redemption' | 'dividend' | 'interest' | 'fee';
  date: string;
  categoryId: string;
  description: string;
  merchant?: string;
  notes?: string;
  tags: string[];
  status: 'pending' | 'cleared' | 'reconciled' | 'flagged';
  isRecurring: boolean;
  isTaxRelevant: boolean;
}

const MONTH_MAP: Record<string, string> = {
  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
  'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
  'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
};

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split(/[\s-]+/);
  if (parts.length !== 3) return null;
  const day = parts[0].padStart(2, '0');
  const month = MONTH_MAP[parts[1]];
  const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

function parseAmount(amountStr: string): number {
  if (!amountStr || amountStr.trim() === '') return 0;
  const cleaned = amountStr
    .replace(/[₹,\s]/g, '')
    .replace(/^=/, '');
  try {
    return Math.round(parseFloat(cleaned) * 100);
  } catch {
    return 0;
  }
}

function evaluateFormula(formula: string): number {
  if (!formula || formula.trim() === '') return 0;
  const cleaned = formula.trim().replace(/^=/, '');
  if (!/^[-+/*().\d\s]+$/.test(cleaned)) return parseAmount(cleaned);
  try {
    const result = Function(`"use strict"; return (${cleaned})`)();
    if (typeof result !== 'number' || !isFinite(result)) return 0;
    return Math.round(result * 100);
  } catch {
    return parseAmount(cleaned);
  }
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function findCategoryId(categories: any[], type: 'income' | 'expense' | 'transfer', fallbackName: string): string {
  const systemCats = categories.filter(c => c.isSystem && c.type === type);
  if (systemCats.length > 0) return systemCats[0].id;
  const allCats = categories.filter(c => c.type === type);
  if (allCats.length > 0) return allCats[0].id;
  return generateId();
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: string[][] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length >= headers.length) {
      rows.push(values);
    }
  }
  
  return { headers, rows };
}

// Embedded CSV data
const ADHOC_CSV = `Date,Day,Amount (₹),Spent (₹)
9 Nov 2025,Sunday,,0
13 Nov 2025,Thursday,334,118
14 Nov 2025,Friday,265.49,310
18 Nov 2025,Tuesday,5.1,0
19 Nov 2025,Wednesday,1604.36,21
20 Nov 2025,Thursday,-256,256
21 Nov 2025,Friday,-206,206
22 Nov 2025,Saturday,-230,230
23 Nov 2025,Sunday,-50,0
24 Nov 2025,Monday,-174,174
25 Nov 2025,Tuesday,5551.39,123.5
26 Nov 2025,Wednesday,1950,50
27 Nov 2025,Thursday,-5221.5,5221.5
28 Nov 2025,Friday,-1696.41,1697
29 Nov 2025,Saturday,-130,130
30 Nov 2025,Sunday,-133,133
1 Dec 2025,Monday,-2157,2157
2 Dec 2025,Tuesday,18370.1,0
2 Dec 2025,Tuesday,-6815,6815
3 Dec 2025,Wednesday,-206,206
4 Dec 2025,Thursday,-578,578
5 Dec 2025,Friday,-130.41,131
6 Dec 2025,Saturday,-15,15
7 Dec 2025,Sunday,-7019.5,7019.5
8 Dec 2025,Monday,-209,209
9 Dec 2025,Tuesday,-147.92,149
10 Dec 2025,Wednesday,-126,126
11 Dec 2025,Thursday,-149,149
11 Dec 2025,Thursday,2400,0
12 Dec 2025,Friday,-143,143
13 Dec 2025,Saturday,-365,365
14 Dec 2025,Sunday,-15,15
15 Dec 2025,Monday,-243.5,243.5
16 Dec 2025,Tuesday,-339,339
17 Dec 2025,Wednesday,-498,498
18 Dec 2025,Thursday,-249,249
19 Dec 2025,Friday,-143,143
20 Dec 2025,Saturday,-35,35
21 Dec 2025,Sunday,-122,122
22 Dec 2025,Monday,-1045.69,1047
23 Dec 2025,Tuesday,-27,27
24 Dec 2025,Wednesday,211,0
24 Dec 2025,Wednesday,-168.5,168.5
25 Dec 2025,Thursday,-35,35
26 Dec 2025,Friday,-221.72,221.72
27 Dec 2025,Saturday,-135.5,135.5
28 Dec 2025,Sunday,-55,55
29 Dec 2025,Monday,-161,161
30 Dec 2025,Tuesday,-156,257
30 Dec 2025,Tuesday,3300,0
31 Dec 2025,Wednesday,-35,35
1 Jan 2026,Thursday,-7721,7721
1 Jan 2026,Thursday,20271.56,0
2 Jan 2026,Friday,-183,183
3 Jan 2026,Saturday,-1226,1226
4 Jan 2026,Sunday,-225,225
5 Jan 2026,Monday,-7291.34,7292
6 Jan 2026,Tuesday,-230.5,230.5
7 Jan 2026,Wednesday,-55,55
8 Jan 2026,Thursday,-107,107
9 Jan 2026,Friday,-251.5,251.5
10 Jan 2026,Saturday,-35,35
11 Jan 2026,Sunday,-145,145
12 Jan 2026,Monday,-337,352
13 Jan 2026,Tuesday,-197,197
14 Jan 2026,Wednesday,-47,47
15 Jan 2026,Thursday,-105,105
16 Jan 2026,Friday,-319,319
16 Jan 2026,Friday,28671,0
17 Jan 2026,Saturday,-616,616
18 Jan 2026,Sunday,-25,25
18 Jan 2026,Sunday,10100,0
19 Jan 2026,Monday,-149,149
20 Jan 2026,Tuesday,-143,143
21 Jan 2026,Wednesday,-25,25
22 Jan 2026,Thursday,-99,99
23 Jan 2026,Friday,-955.9,955.9
23 Jan 2026,Friday,3000,0
24 Jan 2026,Saturday,-31,35
25 Jan 2026,Sunday,-490,490
26 Jan 2026,Monday,-77,77
27 Jan 2026,Tuesday,-339,339
28 Jan 2026,Wednesday,-44322,44322
29 Jan 2026,Thursday,-101,101
30 Jan 2026,Friday,-161,161
31 Jan 2026,Saturday,-150,150
1 Feb 2026,Sunday,-795,895
2 Feb 2026,Monday,-285,285
2 Feb 2026,Monday,20311,0
3 Feb 2026,Tuesday,-354,354
4 Feb 2026,Wednesday,-45,45
5 Feb 2026,Thursday,-10201.22,10201.22
6 Feb 2026,Friday,-366.9,366.9
7 Feb 2026,Saturday,-54,54
8 Feb 2026,Sunday,-640,640
9 Feb 2026,Monday,-161,161
10 Feb 2026,Tuesday,-173,173
11 Feb 2026,Wednesday,-71,71
12 Feb 2026,Thursday,-7662,7662
12 Feb 2026,Thursday,1801.24,0
13 Feb 2026,Friday,-290,290
14 Feb 2026,Saturday,-235,235
15 Feb 2026,Sunday,-124,124
16 Feb 2026,Monday,-339,339
17 Feb 2026,Tuesday,-257,257
18 Feb 2026,Wednesday,-37,37
19 Feb 2026,Thursday,-137,137
20 Feb 2026,Friday,-12934.32,12934.32
20 Feb 2026,Friday,29783.06,0
21 Feb 2026,Saturday,-143,143
22 Feb 2026,Sunday,-320.24,321
23 Feb 2026,Monday,-209,209
24 Feb 2026,Tuesday,-262.56,264
25 Feb 2026,Wednesday,-95,95
26 Feb 2026,Thursday,-143,143
27 Feb 2026,Friday,-93,93
28 Feb 2026,Saturday,-2037.73,2065
1 Mar 2026,Sunday,-181,181
2 Mar 2026,Monday,16114,6054
3 Mar 2026,Tuesday,-303.42,303.42
4 Mar 2026,Wednesday,6671,329
5 Mar 2026,Thursday,-23867,23867
6 Mar 2026,Friday,59525,140475
7 Mar 2026,Saturday,-91,91
8 Mar 2026,Sunday,-3081.79,3083
9 Mar 2026,Monday,-10733.17,10744.7
10 Mar 2026,Tuesday,-224,329
11 Mar 2026,Wednesday,-72,73
12 Mar 2026,Thursday,-351,351
13 Mar 2026,Friday,-255,255
14 Mar 2026,Saturday,-97,97
15 Mar 2026,Sunday,-49,49
16 Mar 2026,Monday,-393.39,393.39
17 Mar 2026,Tuesday,-595.16,595.16
18 Mar 2026,Wednesday,-29771.8,30049
19 Mar 2026,Thursday,-258,378
20 Mar 2026,Friday,-3870.68,3870.68
21 Mar 2026,Saturday,-804,804
22 Mar 2026,Sunday,518,83
23 Mar 2026,Monday,-385,385
24 Mar 2026,Tuesday,-361,361
25 Mar 2026,Wednesday,-111.63,203
26 Mar 2026,Thursday,-351,351
27 Mar 2026,Friday,-184,184
28 Mar 2026,Saturday,-197,197
29 Mar 2026,Sunday,-159,159
30 Mar 2026,Monday,-5087.5,5363
31 Mar 2026,Tuesday,-256.98,348.69
1 Apr 2026,Wednesday,156.18,0
1 Apr 2026,Wednesday,-1095,1095
2 Apr 2026,Thursday,-1957,1957
2 Apr 2026,Thursday,22605.77,0
3 Apr 2026,Friday,-9731.53,9731.53
4 Apr 2026,Saturday,-1353.34,2363
5 Apr 2026,Sunday,-1863,1863
6 Apr 2026,Monday,-6737.26,6737.26
7 Apr 2026,Tuesday,4277.42,722.58
8 Apr 2026,Wednesday,-9012,9012
9 Apr 2026,Thursday,-6258.6,6258.6
10 Apr 2026,Friday,91.05,15
11 Apr 2026,Saturday,-47,47
12 Apr 2026,Sunday,2058.79,1042
13 Apr 2026,Monday,155,15
14 Apr 2026,Tuesday,4441.13,15
15 Apr 2026,Wednesday,41.86,0
16 Apr 2026,Thursday,600,0
17 Apr 2026,Friday,159.4,0
19 Apr 2026,Sunday,2004,0
20 Apr 2026,Monday,1011,0
21 Apr 2026,Tuesday,224.89,0
23 Apr 2026,Thursday,451.57,12
24 Apr 2026,Friday,1488,12
25 Apr 2026,Saturday,-812,1012
26 Apr 2026,Sunday,18.75,0
27 Apr 2026,Monday,1432.07,0
28 Apr 2026,Tuesday,514,0
29 Apr 2026,Wednesday,16,0
30 Apr 2026,Thursday,500,0
1 May 2026,Friday,-724.85,1000
2 May 2026,Saturday,22697.15,0
3 May 2026,Sunday,-24434.22,25000
4 May 2026,Monday,951.92,0
5 May 2026,Tuesday,8830.86,21500
6 May 2026,Wednesday,5500,0
7 May 2026,Thursday,-1000,1000
8 May 2026,Friday,-30,30
9 May 2026,Saturday,-1680,1680
10 May 2026,Sunday,-465.89,500
12 May 2026,Tuesday,3098,1002
13 May 2026,Wednesday,1346,654
14 May 2026,Thursday,-24,24
15 May 2026,Friday,-1816,2024
16 May 2026,Saturday,-1687.81,2000
17 May 2026,Sunday,33.04,0
18 May 2026,Monday,146,24
19 May 2026,Tuesday,1975,0
20 May 2026,Wednesday,-100,100
21 May 2026,Thursday,70.5,12
24 May 2026,Sunday,-1015.6,1050
25 May 2026,Monday,2258,12
28 May 2026,Thursday,8.86,0
29 May 2026,Friday,-24,24
30 May 2026,Saturday,183.42,0
31 May 2026,Sunday,31.65,0
1 Jun 2026,Monday,-868.48,1120
2 Jun 2026,Tuesday,22673.49,24
3 Jun 2026,Wednesday,-3700,3700
5 Jun 2026,Friday,-19469.81,20469.81
6 Jun 2026,Saturday,-3210,3210
7 Jun 2026,Sunday,-410.72,474.05
8 Jun 2026,Monday,-7342,7512
9 Jun 2026,Tuesday,-12,12
11 Jun 2026,Thursday,27.42,24
15 Jun 2026,Monday,1563.49,0
19 Jun 2026,Friday,7500,0
20 Jun 2026,Saturday,53,0
21 Jun 2026,Sunday,22.07,0
22 Jun 2026,Monday,153,0
26 Jun 2026,Friday,26.04,0
29 Jun 2026,Monday,178.25,0
1 Jul 2026,Wednesday,19000,1000
5 Jul 2026,Sunday,-18366.75,18378.51
6 Jul 2026,Monday,170,0
7 Jul 2026,Tuesday,314,0
10 Jul 2026,Friday,19004,0
11 Jul 2026,Saturday,99,0
12 Jul 2026,Sunday,195.05,0
13 Jul 2026,Monday,235,0`;

const STEPUPS_CSV = `Effective Date,Monthly Contribution (₹)
8 Nov 2025,"₹1,000.00"
2 Dec 2025,"₹1,000.00"
1 Jan 2026,"₹1,000.00"
2 Feb 2026,"₹1,000.00"
2 Mar 2026,"₹1,000.00"
2 Apr 2026,"₹1,000.00"
2 May 2026,"₹1,000.00"
2 Jun 2026,"₹1,000.00"
1 Jul 2026,"₹1,000.00"`;

const KOTAK_CSV = `Date,Month-Year,Opening Balance (₹),Credit (₹),Debit (₹),Closing Balance (₹)
1 Jun 2026,Jun 26,₹0.00,₹2.19,₹0.00,₹2.19
2 Jun 2026,Jun 26,₹2.19,"₹21,311.00","₹21,311.00",₹2.19
3 Jun 2026,Jun 26,₹2.19,₹0.00,,₹2.19
4 Jun 2026,Jun 26,₹2.19,₹0.00,,₹2.19
5 Jun 2026,Jun 26,₹2.19,"₹3,000.00","₹3,000.00",₹2.19
6 Jun 2026,Jun 26,₹2.19,₹0.00,,₹2.19
7 Jun 2026,Jun 26,₹2.19,₹0.00,,₹2.19
8 Jun 2026,Jun 26,₹2.19,"₹1,000.00","₹1,000.00",₹2.19
9 Jun 2026,Jun 26,₹2.19,₹0.00,,₹2.19
10 Jun 2026,Jun 26,₹2.19,₹0.00,,₹2.19
11 Jun 2026,Jun 26,₹2.19,"₹2,400.00",,"₹2,402.19"
12 Jun 2026,Jun 26,"₹2,402.19","₹5,400.00","₹2,432.00","₹5,370.19"
13 Jun 2026,Jun 26,"₹5,370.19",,₹55.00,"₹5,315.19"
14 Jun 2026,Jun 26,"₹5,315.19",₹0.00,,"₹5,315.19"
15 Jun 2026,Jun 26,"₹5,315.19",,₹24.00,"₹5,291.19"
16 Jun 2026,Jun 26,"₹5,291.19",,₹32.00,"₹5,259.19"`;

const AXIS_CC_CSV = `Credit Limit,53000,,,,,,,
Total Spent,"₹4,010.88",,,,,,,
Total Paid,₹0.00,,,,,,,
Outstanding,"₹4,010.88",7.57%,Usage: 7.57% - 🟢 Safe,,,,,,
Available Limit,"₹48,989.12",92.43%,,,,,,
,,Usage Bar,,,,,,,
Date,Cycle,Start Date,Type,Spend Amount,Repayed Amount,Cashback %,Cashback,Running Balance,Limit Left
9 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹198.00,,0%,,,
10 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹26.00,,0%,,,
11 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹310.00,,3%,,,
12 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹825.00,,3%,,,
13 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹340.00,,3%,,,
14 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹449.00,,3%,,,
15 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹230.00,,3%,,,
16 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹300.00,,3%,,,
17 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹862.88,,3%,,,
18 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹470.00,,3%,,,
`;

const SLICE_CC_CSV = `Credit Limit,75000,,,,,,,,,
Total Spent,"₹71,088.36",,,,,,,,
Total Paid,"₹48,828.87",,,,,,,,
Outstanding,"₹22,259.49",29.68%,Usage: 29.68% - 🟢 Safe,,,,,,,
Available Limit,"₹52,740.51",70.32%,,,,,,,,
,,Usage Bar,,,,,,,,
Date,Cycle,Start Date,Type,Spend Amount,Repayed Amount,Monies from fire,Monies from Spend,Running Balance,Limit Left,Days Held,Interest Earned
9 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹300.00,,272,300,₹300.00,"₹74,700.00",,
10 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,"₹7,311.48",,200,7311,"₹7,611.48","₹67,388.52",1,₹0.04
10 Apr 2026,Mar 26 - Apr 26,21 Mar ,Repayment,,₹50.00,,,"₹7,561.48","₹67,438.52",0,₹0.00
11 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹100.00,,128,100,"₹7,661.48","₹67,338.52",1,₹1.09
11 Apr 2026,Mar 26 - Apr 26,21 Mar ,Repayment,,"₹4,032.00",,,"₹3,629.48","₹71,370.52",0,₹0.00
12 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹290.80,,,290,"₹3,920.28","₹71,079.72",1,₹0.52
13 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,"₹1,331.00",,450,1331,"₹5,251.28","₹69,748.72",1,₹0.56
14 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,"₹1,105.30",,562,1105,"₹6,356.58","₹68,643.42",1,₹0.76
15 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹658.99,,204,658,"₹7,015.57","₹67,984.43",1,₹0.91
15 Apr 2026,Mar 26 - Apr 26,21 Mar ,Repayment,,₹622.99,,,"₹6,392.58","₹68,607.42",0,₹0.00
16 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹363.00,,253,363,"₹6,755.58","₹68,244.42",1,₹0.92
16 Apr 2026,Mar 26 - Apr 26,21 Mar ,Repayment,,₹70.00,,,"₹6,685.58","₹68,314.42",0,₹0.00
17 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,"₹1,557.96",,428,1557,"₹8,243.54","₹66,756.46",1,₹0.96
18 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹36.00,,,36,"₹8,279.54","₹66,720.46",1,₹1.19
19 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹48.00,,67,48,"₹8,327.54","₹66,672.46",1,₹1.19
20 Apr 2026,Mar 26 - Apr 26,21 Mar ,Spend,₹418.00,,247,418,"₹8,745.54","₹66,254.46",1,₹1.20
20 Apr 2026,Mar 26 - Apr 26,21 Mar ,Repayment,,₹50.00,,,"₹8,695.54","₹66,304.46",0,₹0.00
21 Apr 2026,Apr 26 - May 26,21 Apr ,Spend,₹533.00,,91,533,"₹9,228.54","₹65,771.46",1,₹1.25
22 Apr 2026,Apr 26 - May 26,21 Apr ,Spend,"₹2,780.00",,514,2780,"₹12,008.54","₹62,991.46",1,₹1.33
23 Apr 2026,Apr 26 - May 26,21 Apr ,Spend,"₹1,067.00",,89,1067,"₹13,075.54","₹61,924.46",1,₹1.73
23 Apr 2026,Apr 26 - May 26,21 Apr ,Repayment,,₹75.00,,,"₹13,000.54","₹61,999.46",0,₹0.00
24 Apr 2026,Apr 26 - May 26,21 Apr ,Spend,₹353.00,,385,353,"₹13,353.54","₹61,646.46",1,₹1.87
25 Apr 2026,Apr 26 - May 26,21 Apr ,Spend,₹345.00,,175,345,"₹13,698.54","₹61,301.46",1,₹1.92
25 Apr 2026,Apr 26 - May 26,21 Apr ,Repayment,,₹75.00,,,"₹13,623.54","₹61,376.46",0,₹0.00
26 Apr 2026,Apr 26 - May 26,21 Apr ,Spend,₹131.00,,152,131,"₹13,754.54","₹61,245.46",1,₹1.96
27 Apr 2026,Apr 26 - May 26,21 Apr ,Spend,"₹4,202.00",,222,4202,"₹17,956.54","₹57,043.46",1,₹1.98
28 Apr 2026,Apr 26 - May 26,21 Apr ,Spend,₹454.00,,242,454,"₹18,410.54","₹56,589.46",1,₹2.58
29 Apr 2026,Apr 26 - May 26,21 Apr ,Spend,₹85.00,,,85,"₹18,495.54","₹56,504.46",1,₹2.65
30 Apr 2026,Apr 26 - May 26,21 Apr ,Spend,₹332.02,,291,332,"₹18,827.56","₹56,172.44",1,₹2.66
30 Apr 2026,Apr 26 - May 26,21 Apr ,Repayment,,₹50.00,,,"₹18,777.56","₹56,222.44",0,₹0.00
1 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹362.60,,325,362,"₹19,140.16","₹55,859.84",1,₹2.70
1 May 2026,Apr 26 - May 26,21 Apr ,Repayment,,₹70.00,,,"₹19,070.16","₹55,929.84",0,₹0.00
2 May 2026,Apr 26 - May 26,21 Apr ,Spend,"₹3,220.00",,198,3220,"₹22,290.16","₹52,709.84",1,₹2.74
3 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹687.00,,394,687,"₹22,977.16","₹52,022.84",1,₹3.21
4 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹648.00,,85,648,"₹23,625.16","₹51,374.84",1,₹3.30
5 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹273.00,,348,273,"₹23,898.16","₹51,101.84",1,₹3.40
5 May 2026,Apr 26 - May 26,21 Apr ,Repayment,,"₹12,000.00",,,"₹11,898.16","₹63,101.84",0,₹0.00
6 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹212.00,,82,212,"₹12,110.16","₹62,889.84",1,₹1.71
7 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹327.00,,210,327,"₹12,437.16","₹62,562.84",1,₹1.74
8 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹48.00,,158,48,"₹12,485.16","₹62,514.84",1,₹1.79
9 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹506.25,,314,506,"₹12,991.41","₹62,008.59",1,₹1.80
10 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹12.00,,176,12,"₹13,003.41","₹61,996.59",1,₹1.87
11 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹336.00,,170,336,"₹13,339.41","₹61,660.59",1,₹1.87
12 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹339.00,,323,339,"₹13,678.41","₹61,321.59",1,₹1.92
12 May 2026,Apr 26 - May 26,21 Apr ,Repayment,,₹60.60,,,"₹13,617.81","₹61,382.19",0,₹0.00
13 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹174.00,,116,174,"₹13,791.81","₹61,208.19",1,₹1.96
14 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹167.00,,82,167,"₹13,958.81","₹61,041.19",1,₹1.98
15 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹416.00,,311,416,"₹14,374.81","₹60,625.19",1,₹2.01
16 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹486.00,,286,486,"₹14,860.81","₹60,139.19",1,₹2.07
16 May 2026,Apr 26 - May 26,21 Apr ,Repayment,,₹50.00,,,"₹14,810.81","₹60,189.19",0,₹0.00
17 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹98.00,,,98,"₹14,908.81","₹60,091.19",1,₹2.13
18 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹397.00,,169,397,"₹15,305.81","₹59,694.19",1,₹2.14
19 May 2026,Apr 26 - May 26,21 Apr ,Spend,1144,,502,1144,"₹16,449.81","₹58,550.19",1,₹2.20
20 May 2026,Apr 26 - May 26,21 Apr ,Spend,₹20.00,,135,20,"₹16,469.81","₹58,530.19",1,₹2.37
21 May 2026,May 26 - Jun 26,21 May ,Spend,₹12.00,,,12,"₹16,481.81","₹58,518.19",1,₹2.37
22 May 2026,May 26 - Jun 26,21 May ,Spend,₹232.00,,87,232,"₹16,713.81","₹58,286.19",1,₹2.37
23 May 2026,May 26 - Jun 26,21 May ,Spend,₹79.00,,117,79,"₹16,792.81","₹58,207.19",1,₹2.40
24 May 2026,May 26 - Jun 26,21 May ,Spend,₹361.00,,284,361,"₹17,153.81","₹57,846.19",1,₹2.42
25 May 2026,May 26 - Jun 26,21 May ,Spend,₹340.00,,137,340,"₹17,493.81","₹57,506.19",1,₹2.47
26 May 2026,May 26 - Jun 26,21 May ,Spend,₹482.75,,369,482,"₹17,976.56","₹57,023.44",1,₹2.52
26 May 2026,May 26 - Jun 26,21 May ,Repayment,,₹100.00,,,"₹17,876.56","₹57,123.44",0,₹0.00
27 May 2026,May 26 - Jun 26,21 May ,Spend,₹49.00,,,49,"₹17,925.56","₹57,074.44",1,₹2.57
28 May 2026,May 26 - Jun 26,21 May ,Spend,₹261.00,,70,261,"₹18,186.56","₹56,813.44",1,₹2.58
29 May 2026,May 26 - Jun 26,21 May ,Spend,₹598.98,,324,598,"₹18,785.54","₹56,214.46",1,₹2.62
29 May 2026,May 26 - Jun 26,21 May ,Repayment,,75,,,"₹18,710.54","₹56,289.46",0,₹0.00
30 May 2026,May 26 - Jun 26,21 May ,Spend,138,,,138,"₹18,848.54","₹56,151.46",1,₹2.69
31 May 2026,May 26 - Jun 26,21 May ,Spend,298,,,298,"₹19,146.54","₹55,853.46",1,₹2.71
1 Jun 2026,May 26 - Jun 26,21 May ,Spend,332,,281,332,"₹19,478.54","₹55,521.46",1,₹2.75
2 Jun 2026,May 26 - Jun 26,21 May ,Spend,301,,849,301,"₹19,779.54","₹55,220.46",1,₹2.80
2 Jun 2026,May 26 - Jun 26,21 May ,Repayment,,60.2,,,"₹19,719.34","₹55,280.66",0,₹0.00
3 Jun 2026,May 26 - Jun 26,21 May ,Spend,0,,,0,"₹19,719.34","₹55,280.66",1,₹2.84
4 Jun 2026,May 26 - Jun 26,21 May ,Spend,338,,495,338,"₹20,057.34","₹54,942.66",1,₹2.84
5 Jun 2026,May 26 - Jun 26,21 May ,Spend,12,,302,12,"₹20,069.34","₹54,930.66",1,₹2.88
5 Jun 2026,May 26 - Jun 26,21 May ,Repayment,,16469.81,,,"₹3,599.53","₹71,400.47",0,₹0.00
6 Jun 2026,May 26 - Jun 26,21 May ,Spend,0,,,0,"₹3,599.53","₹71,400.47",1,₹0.52
7 Jun 2026,May 26 - Jun 26,21 May ,Spend,2976,,447,2976,"₹6,575.53","₹68,424.47",1,₹0.52
8 Jun 2026,May 26 - Jun 26,21 May ,Spend,366,,787,366,"₹6,941.53","₹68,058.47",1,₹1.00
9 Jun 2026,May 26 - Jun 26,21 May ,Spend,234,,680,234,"₹7,175.53","₹67,824.47",1,₹1.00
10 Jun 2026,May 26 - Jun 26,21 May ,Spend,3075,,,3075,"₹10,250.53","₹64,749.47",1,₹1.03
11 Jun 2026,May 26 - Jun 26,21 May ,Spend,328,,262,328,"₹10,578.53","₹64,421.47",1,₹1.47
12 Jun 2026,May 26 - Jun 26,21 May ,Spend,323.68,,108,323,"₹10,902.21","₹64,097.79",1,₹1.52
13 Jun 2026,May 26 - Jun 26,21 May ,Spend,46,,282,46,"₹10,948.21","₹64,051.79",1,₹1.57
14 Jun 2026,May 26 - Jun 26,21 May ,Spend,0,,,0,"₹10,948.21","₹64,051.79",1,₹1.57
15 Jun 2026,May 26 - Jun 26,21 May ,Spend,2640,,141,2640,"₹13,588.21","₹61,411.79",1,₹1.57
16 Jun 2026,May 26 - Jun 26,21 May ,Spend,300.3,,925,300,"₹13,888.51","₹61,111.49",1,₹1.95
16 Jun 2026,May 26 - Jun 26,21 May ,Repayment,,75,,,"₹13,813.51","₹61,186.49",0,₹0.00`;

type ImporterType = 'adhoc' | 'stepups' | 'kotak' | 'axis' | 'slice' | 'emi_card' | 'fd' | 'investment';

const ACCOUNT_CSV_MAP: Record<string, { csv: string; importer: ImporterType }[]> = {
  'Slice Saving Account': [
    { csv: ADHOC_CSV, importer: 'adhoc' },
    { csv: STEPUPS_CSV, importer: 'stepups' },
  ],
  'Kotak Mahindra Saving Account': [
    { csv: KOTAK_CSV, importer: 'kotak' },
  ],
  'Axis Credit Card': [
    { csv: AXIS_CC_CSV, importer: 'axis' },
  ],
  'Slice Credit Card': [
    { csv: SLICE_CC_CSV, importer: 'slice' },
  ],
  'Bajaj Finserv EMI Card': [
    { csv: '', importer: 'emi_card' },
  ],
};

const CSV_KEYWORDS: { keywords: string[]; csvs: { csv: string; importer: ImporterType }[] }[] = [
  { keywords: ['slice', 'saving'], csvs: ACCOUNT_CSV_MAP['Slice Saving Account'] },
  { keywords: ['kotak', 'saving'], csvs: ACCOUNT_CSV_MAP['Kotak Mahindra Saving Account'] },
  { keywords: ['axis', 'credit', 'cc'], csvs: ACCOUNT_CSV_MAP['Axis Credit Card'] },
  { keywords: ['slice', 'credit', 'cc'], csvs: ACCOUNT_CSV_MAP['Slice Credit Card'] },
  { keywords: ['bajaj', 'emi'], csvs: ACCOUNT_CSV_MAP['Bajaj Finserv EMI Card'] },
  { keywords: ['emi', 'card'], csvs: [{ csv: '', importer: 'emi_card' }] },
  { keywords: ['fd', 'fixed', 'deposit'], csvs: [{ csv: '', importer: 'fd' }] },
  { keywords: ['investment', 'mutual', 'fund', 'sip'], csvs: [{ csv: '', importer: 'investment' }] },
];

function findCSVMappings(accountName: string): { csv: string; importer: ImporterType }[] | null {
  const lower = accountName.toLowerCase();
  for (const entry of CSV_KEYWORDS) {
    const matchCount = entry.keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount >= 2) return entry.csvs;
  }
  const exact = ACCOUNT_CSV_MAP[accountName];
  if (exact) return exact;
  for (const entry of CSV_KEYWORDS) {
    const matchCount = entry.keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount >= 1) return entry.csvs;
  }
  return null;
}

export async function importFromAdHocCSV(
  csvText: string,
  accountId: string,
  categories: any[]
): Promise<ParsedTransaction[]> {
  try {
    const { headers, rows } = parseCSV(csvText);
    if (rows.length === 0) return [];
    
    const transactions: ParsedTransaction[] = [];
    
    for (const values of rows) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      
      const date = parseDate(row['Date']);
      if (!date) continue;
      
      const amountFormula = row['Amount (₹)'] || '';
      const spent = parseAmount(row['Spent (₹)'] || '');
      const netAmount = evaluateFormula(amountFormula);
      
      if (netAmount === 0 && spent === 0) continue;
      
      let type: 'income' | 'expense' = 'expense';
      let amount = 0;
      
      if (netAmount > 0) {
        type = 'income';
        amount = netAmount;
      } else if (netAmount < 0) {
        type = 'expense';
        amount = Math.abs(netAmount);
      } else if (spent > 0) {
        type = 'expense';
        amount = spent;
      }
      
      const categoryId = findCategoryId(categories, type, '');
      
      transactions.push({
        accountId,
        amount,
        currency: 'INR',
        type,
        date,
        categoryId,
        description: `AdHoc transaction on ${row['Date']}`,
        status: 'cleared',
        isRecurring: false,
        isTaxRelevant: false,
        tags: ['imported', 'adhoc'],
      });
    }
    
    return transactions;
  } catch (error) {
    console.error('Error importing AdHoc CSV:', error);
    return [];
  }
}

export async function importFromStepUpsCSV(
  csvText: string,
  accountId: string,
  categories: any[]
): Promise<ParsedTransaction[]> {
  try {
    const { headers, rows } = parseCSV(csvText);
    if (rows.length === 0) return [];
    
    const transactions: ParsedTransaction[] = [];
    
    for (const values of rows) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      
      const date = parseDate(row['Effective Date']);
      if (!date) continue;
      
      const amount = parseAmount(row['Monthly Contribution (₹)'] || '');
      if (amount === 0) continue;
      
      const categoryId = findCategoryId(categories, 'investment', '');
      
      transactions.push({
        accountId,
        amount,
        currency: 'INR',
        type: 'investment',
        date,
        categoryId,
        description: `Monthly SIP contribution on ${row['Effective Date']}`,
        status: 'cleared',
        isRecurring: true,
        isTaxRelevant: true,
        tags: ['imported', 'stepups', 'sip'],
      });
    }
    
    return transactions;
  } catch (error) {
    console.error('Error importing StepUps CSV:', error);
    return [];
  }
}

export async function importFromKotakCSV(
  csvText: string,
  accountId: string,
  categories: any[]
): Promise<ParsedTransaction[]> {
  try {
    const { headers, rows } = parseCSV(csvText);
    if (rows.length === 0) return [];
    
    const transactions: ParsedTransaction[] = [];
    
    for (const values of rows) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      
      const date = parseDate(row['Date']);
      if (!date || date.includes('Err:')) continue;
      
      const credit = parseAmount(row['Credit (₹)'] || '');
      const debit = parseAmount(row['Debit (₹)'] || '');
      
      if (credit === 0 && debit === 0) continue;
      
      if (credit > 0) {
        const categoryId = findCategoryId(categories, 'income', '');
        transactions.push({
          accountId,
          amount: credit,
          currency: 'INR',
          type: 'income',
          date,
          categoryId,
          description: `Kotak credit on ${row['Date']}`,
          status: 'cleared',
          isRecurring: false,
          isTaxRelevant: false,
          tags: ['imported', 'kotak', 'credit'],
        });
      }
      
      if (debit > 0) {
        const categoryId = findCategoryId(categories, 'expense', '');
        transactions.push({
          accountId,
          amount: debit,
          currency: 'INR',
          type: 'expense',
          date,
          categoryId,
          description: `Kotak debit on ${row['Date']}`,
          status: 'cleared',
          isRecurring: false,
          isTaxRelevant: false,
          tags: ['imported', 'kotak', 'debit'],
        });
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error importing Kotak CSV:', error);
    return [];
  }
}

export async function importFromCCsv(
  csvText: string,
  accountId: string,
  categories: any[],
  cardType: 'axis' | 'slice'
): Promise<ParsedTransaction[]> {
  try {
    const lines = csvText.trim().split('\n');
    
    const dataStartIdx = lines.findIndex(l => l.startsWith('Date,Cycle') || l.startsWith('Date,'));
    if (dataStartIdx === -1) return [];
    
    const headers = lines[dataStartIdx].split(',').map(h => h.trim().replace(/"/g, ''));
    const transactions: ParsedTransaction[] = [];
    
    for (let i = dataStartIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('Err:') || line.startsWith(',')) continue;
      
      const values = line.split(',');
      if (values.length < 5) continue;
      
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx]?.trim() || ''; });
      
      const date = parseDate(row['Date']);
      if (!date) continue;
      
      const type = row['Type'];
      const spendAmount = parseAmount(row['Spend Amount'] || '');
      const repayAmount = parseAmount(row['Repayed Amount'] || row['Repayment Amount'] || '');
      
      if (type === 'Spend' && spendAmount > 0) {
        const categoryId = findCategoryId(categories, 'expense', '');

        let cashbackPaise = 0;
        let cashbackProgram = '';
        let cashbackDescription = '';

        if (cardType === 'axis') {
          const cbPctStr = (row['Cashback %'] || '').replace('%', '').trim();
          const cbPct = parseFloat(cbPctStr) || 0;
          cashbackPaise = Math.round(spendAmount * (cbPct / 100));
          cashbackProgram = 'axis_supermoney';
          cashbackDescription = cbPct > 0 ? `${cbPct}% cashback` : 'No cashback';
        } else if (cardType === 'slice') {
          const moniesFromSpend = parseInt(row['Monies from Spend'] || '0', 10) || 0;
          const redemptionRatePct = 1.0;
          const moniesFromFire = parseInt(row['Monies from fire'] || '0', 10) || 0;
          const totalMonies = moniesFromSpend + moniesFromFire;
          cashbackPaise = Math.round(totalMonies * redemptionRatePct);
          cashbackProgram = 'slice_monies';
          cashbackDescription = `${totalMonies} monies`;
        }

        transactions.push({
          accountId,
          amount: spendAmount,
          currency: 'INR',
          type: 'expense',
          date,
          categoryId,
          description: `${cardType.toUpperCase()} spend on ${row['Date']}`,
          merchant: 'Card Spend',
          status: 'cleared',
          isRecurring: false,
          isTaxRelevant: false,
          tags: ['imported', cardType, 'spend'],
          cashbackPaise,
          cashbackProgram,
          cashbackDescription,
        } as ParsedTransaction & { cashbackPaise?: number; cashbackProgram?: string; cashbackDescription?: string });
      }
      
      if ((type === 'Repayment' || type === 'Repayed') && repayAmount > 0) {
        const categoryId = findCategoryId(categories, 'transfer', '');
        transactions.push({
          accountId,
          amount: repayAmount,
          currency: 'INR',
          type: 'transfer',
          date,
          categoryId,
          description: `${cardType.toUpperCase()} repayment on ${row['Date']}`,
          status: 'cleared',
          isRecurring: false,
          isTaxRelevant: false,
          tags: ['imported', cardType, 'repayment'],
        });
      }
    }
    
    return transactions;
  } catch (error) {
    console.error(`Error importing ${cardType} CC CSV:`, error);
    return [];
  }
}

export async function importFromEMICardCSV(
  csvText: string,
  accountId: string,
  categories: any[]
): Promise<ParsedTransaction[]> {
  try {
    const { headers, rows } = parseCSV(csvText);
    if (rows.length === 0) return [];
    
    const transactions: ParsedTransaction[] = [];
    
    for (const values of rows) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      
      const date = parseDate(row['Date'] || row['Transaction Date']);
      if (!date) continue;
      
      const type = (row['Type'] || row['Transaction Type'] || '').toLowerCase();
      const amount = parseAmount(row['Amount (₹)'] || row['Amount'] || '');
      
      if (amount === 0) continue;
      
      if (type.includes('emi') || type.includes('purchase') || type.includes('spend')) {
        const categoryId = findCategoryId(categories, 'expense', '');
        transactions.push({
          accountId,
          amount,
          currency: 'INR',
          type: 'expense',
          date,
          categoryId,
          description: `EMI purchase on ${row['Date'] || row['Transaction Date']}`,
          status: 'cleared',
          isRecurring: false,
          isTaxRelevant: false,
          tags: ['imported', 'emi_card', 'purchase'],
        });
      } else if (type.includes('payment') || type.includes('emi payment')) {
        const categoryId = findCategoryId(categories, 'transfer', '');
        transactions.push({
          accountId,
          amount,
          currency: 'INR',
          type: 'transfer',
          date,
          categoryId,
          description: `EMI payment on ${row['Date'] || row['Transaction Date']}`,
          status: 'cleared',
          isRecurring: false,
          isTaxRelevant: false,
          tags: ['imported', 'emi_card', 'payment'],
        });
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error importing EMI Card CSV:', error);
    return [];
  }
}

export async function importFromFDCSV(
  csvText: string,
  accountId: string,
  categories: any[]
): Promise<ParsedTransaction[]> {
  try {
    const { headers, rows } = parseCSV(csvText);
    if (rows.length === 0) return [];
    
    const transactions: ParsedTransaction[] = [];
    
    for (const values of rows) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      
      const date = parseDate(row['Date'] || row['Creation Date'] || row['Maturity Date']);
      if (!date) continue;
      
      const amount = parseAmount(row['Amount (₹)'] || row['Principal'] || row['Amount'] || '');
      const rate = parseFloat(row['Rate (%)'] || row['Interest Rate'] || '0');
      const maturityDate = row['Maturity Date'] || '';
      
      if (amount === 0) continue;
      
      const type = (row['Type'] || row['Action'] || 'create').toLowerCase();
      
      if (type.includes('mature') || type.includes('close')) {
        const categoryId = findCategoryId(categories, 'income', '');
        transactions.push({
          accountId,
          amount,
          currency: 'INR',
          type: 'income',
          date,
          categoryId,
          description: `FD matured on ${date}`,
          status: 'cleared',
          isRecurring: false,
          isTaxRelevant: true,
          tags: ['imported', 'fd', 'mature'],
        });
      } else {
        const categoryId = findCategoryId(categories, 'transfer', '');
        transactions.push({
          accountId,
          amount,
          currency: 'INR',
          type: 'transfer',
          date,
          categoryId,
          description: `FD created on ${date}${rate > 0 ? ` at ${rate}%` : ''}`,
          status: 'cleared',
          isRecurring: false,
          isTaxRelevant: true,
          tags: ['imported', 'fd', 'create'],
        } as ParsedTransaction & { fdRate?: number; fdMaturityDate?: string });
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error importing FD CSV:', error);
    return [];
  }
}

export async function importFromInvestmentCSV(
  csvText: string,
  accountId: string,
  categories: any[]
): Promise<ParsedTransaction[]> {
  try {
    const { headers, rows } = parseCSV(csvText);
    if (rows.length === 0) return [];
    
    const transactions: ParsedTransaction[] = [];
    
    for (const values of rows) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      
      const date = parseDate(row['Date'] || row['Transaction Date']);
      if (!date) continue;
      
      const type = (row['Type'] || row['Action'] || '').toLowerCase();
      const amount = parseAmount(row['Amount (₹)'] || row['Amount'] || '');
      const units = parseFloat(row['Units'] || row['Quantity'] || '0');
      const nav = parseFloat(row['NAV'] || row['Price'] || row['Nav/Price'] || '0');
      
      if (amount === 0 && units === 0) continue;
      
      if (type.includes('buy') || type.includes('purchase') || type.includes('sip')) {
        const categoryId = findCategoryId(categories, 'investment', '');
        transactions.push({
          accountId,
          amount: amount > 0 ? amount : Math.round(units * nav * 100),
          currency: 'INR',
          type: 'investment',
          date,
          categoryId,
          description: `Investment purchase on ${date}`,
          status: 'cleared',
          isRecurring: type.includes('sip'),
          isTaxRelevant: true,
          tags: ['imported', 'investment', 'buy'],
        } as ParsedTransaction & { units?: number; navOrPrice?: number });
      } else if (type.includes('sell') || type.includes('redeem') || type.includes('swp')) {
        const categoryId = findCategoryId(categories, 'income', '');
        transactions.push({
          accountId,
          amount: amount > 0 ? amount : Math.round(units * nav * 100),
          currency: 'INR',
          type: 'redemption',
          date,
          categoryId,
          description: `Investment redemption on ${date}`,
          status: 'cleared',
          isRecurring: false,
          isTaxRelevant: true,
          tags: ['imported', 'investment', 'sell'],
        } as ParsedTransaction & { units?: number; navOrPrice?: number });
      } else if (type.includes('dividend')) {
        const categoryId = findCategoryId(categories, 'income', '');
        transactions.push({
          accountId,
          amount,
          currency: 'INR',
          type: 'dividend',
          date,
          categoryId,
          description: `Dividend received on ${date}`,
          status: 'cleared',
          isRecurring: false,
          isTaxRelevant: true,
          tags: ['imported', 'investment', 'dividend'],
        });
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error importing Investment CSV:', error);
    return [];
  }
}

export async function importTransactionsForAccount(
  accountName: string,
  accountId: string
): Promise<void> {
  const mappings = findCSVMappings(accountName);
  if (!mappings || mappings.length === 0) {
    console.log(`No CSV mapping found for account: ${accountName}`);
    return;
  }
  
  const categories = await getAllCategories();
  
  for (const mapping of mappings) {
    let transactions: ParsedTransaction[] = [];
    
    try {
      switch (mapping.importer) {
        case 'adhoc':
          transactions = await importFromAdHocCSV(mapping.csv, accountId, categories);
          break;
        case 'stepups':
          transactions = await importFromStepUpsCSV(mapping.csv, accountId, categories);
          break;
        case 'kotak':
          transactions = await importFromKotakCSV(mapping.csv, accountId, categories);
          break;
        case 'axis':
          transactions = await importFromCCsv(mapping.csv, accountId, categories, 'axis');
          break;
        case 'slice':
          transactions = await importFromCCsv(mapping.csv, accountId, categories, 'slice');
          break;
        case 'emi_card':
          transactions = await importFromEMICardCSV(mapping.csv, accountId, categories);
          break;
        case 'fd':
          transactions = await importFromFDCSV(mapping.csv, accountId, categories);
          break;
        case 'investment':
          transactions = await importFromInvestmentCSV(mapping.csv, accountId, categories);
          break;
      }
      
      let balanceDeltaPaise = 0;

      for (const txn of transactions) {
        const tx: any = txn;
        await insertTransaction({
          id: generateId(),
          ...txn,
          counterpartAccountId: undefined,
          subcategoryId: undefined,
          receiptImageUri: undefined,
          recurringRuleId: undefined,
          investmentId: undefined,
          units: tx.units ?? undefined,
          navOrPrice: tx.navOrPrice ?? undefined,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cashbackPaise: tx.cashbackPaise ?? undefined,
          cashbackProgram: tx.cashbackProgram ?? undefined,
          cashbackDescription: tx.cashbackDescription ?? undefined,
          fdRate: tx.fdRate ?? undefined,
          fdMaturityDate: tx.fdMaturityDate ?? undefined,
        });

        if (['income', 'dividend', 'interest'].includes(tx.type)) {
          balanceDeltaPaise += tx.amount;
        } else if (['expense', 'fee', 'emi_purchase'].includes(tx.type)) {
          balanceDeltaPaise -= tx.amount;
        } else if (['transfer', 'emi_payment', 'fd_mature'].includes(tx.type)) {
          balanceDeltaPaise += tx.amount;
        } else if (['investment', 'fd_create'].includes(tx.type)) {
          balanceDeltaPaise -= tx.amount;
        } else if (tx.type === 'redemption') {
          balanceDeltaPaise += tx.amount;
        }
      }

      if (balanceDeltaPaise !== 0) {
        await updateAccountBalance(accountId, balanceDeltaPaise);
      }
      
      console.log(`Imported ${transactions.length} transactions for ${accountName}`);
    } catch (error) {
      console.error(`Error importing transactions for ${accountName}:`, error);
    }
  }
}