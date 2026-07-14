import { getDatabase } from '../database';
import type { Category } from '@finance/engine';

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = db.getAll<Record<string, unknown>>(
    'SELECT * FROM categories ORDER BY sort_order'
  );
  return rows.map(mapRow);
}

export async function getCategoriesByType(type: string): Promise<Category[]> {
  const db = await getDatabase();
  const rows = db.getAll<Record<string, unknown>>(
    'SELECT * FROM categories WHERE type = ? ORDER BY sort_order',
    [type]
  );
  return rows.map(mapRow);
}

export async function insertCategory(cat: Category): Promise<void> {
  const db = await getDatabase();
  db.execute(
    `INSERT INTO categories (id, name, parent_id, type, icon, color, is_system, sort_order, budget_amount, budget_period)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cat.id, cat.name, cat.parentId ?? null, cat.type,
      cat.icon, cat.color, cat.isSystem ? 1 : 0, cat.sortOrder,
      cat.budgetAmount ?? null, cat.budgetPeriod ?? null,
    ]
  );
}

function mapRow(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    parentId: row.parent_id ? (row.parent_id as string) : undefined,
    type: row.type as 'income' | 'expense' | 'transfer' | 'investment',
    icon: row.icon as string,
    color: row.color as string,
    isSystem: (row.is_system as number) === 1,
    sortOrder: row.sort_order as number,
    budgetAmount: row.budget_amount ? (row.budget_amount as number) : undefined,
    budgetPeriod: row.budget_period ? (row.budget_period as 'monthly' | 'quarterly' | 'yearly') : undefined,
  };
}
