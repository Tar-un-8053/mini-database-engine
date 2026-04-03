import { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, Sparkles, User, Copy, Play, Loader2,
  MessageSquare, Trash2, ChevronDown, ChevronUp, Database,
  Wand2, CheckCircle2, XCircle, Clock, RotateCcw,
} from 'lucide-react';
import { ResultCharts } from './ResultCharts';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sql?: string;
  result?: QueryResult | null;
  intentLabel?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  tips?: string[];
  followUps?: string[];
  timestamp: Date;
}

interface QueryResult {
  success: boolean;
  message: string;
  data?: Record<string, any>[];
  executionTime?: number;
  rowsAffected?: number;
}

interface AIChatBotProps {
  onExecuteSQL: (sql: string) => Promise<QueryResult>;
  tables: { name: string; columns: { name: string; type: string }[] }[];
}

interface AssistantPlan {
  explanation: string;
  sql?: string;
  shouldExecute: boolean;
  intentLabel: string;
  confidence: 'High' | 'Medium' | 'Low';
  tips: string[];
  followUps: string[];
}

// ─── NLP to SQL Engine ─────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.toLowerCase().trim()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ');
}

function generateSQL(input: string, tables: AIChatBotProps['tables']): { sql: string; explanation: string } {
  const text = normalizeText(input);
  const tableNames = tables.map(t => t.name.toLowerCase());
  const tableMap = new Map(tables.map(t => [t.name.toLowerCase(), t]));

  // Find which table the user is referring to
  let targetTable = '';
  let targetTableInfo: (typeof tables)[0] | undefined;
  for (const name of tableNames) {
    // Match table name or its singular/plural form
    const singular = name.replace(/s$/, '');
    if (text.includes(name) || text.includes(singular)) {
      targetTable = tables.find(t => t.name.toLowerCase() === name)!.name;
      targetTableInfo = tableMap.get(name);
      break;
    }
  }

  // If no table found, use the first table
  if (!targetTable && tables.length > 0) {
    targetTable = tables[0].name;
    targetTableInfo = tables[0];
  }

  if (!targetTable) {
    return { sql: '-- No tables found in database', explanation: 'No tables exist in the database yet. Create a table first.' };
  }

  const colNames = targetTableInfo?.columns.map(c => c.name.toLowerCase()) || [];
  const colMap = new Map(targetTableInfo?.columns.map(c => [c.name.toLowerCase(), c.name]) || []);

  // Find mentioned column
  const findColumn = (t: string): string | null => {
    for (const col of colNames) {
      if (t.includes(col)) return colMap.get(col) || col;
    }
    return null;
  };

  // ─── Pattern Matching ─────────────────────────────────────────

  // SHOW ALL / GET ALL / LIST ALL
  if (/show\s*(me\s*)?(all|every|the)\s*(data|records?|rows?|entries?|info|information)?|get\s*(all|every)|list\s*(all|every)|display\s*(all|every)|fetch\s*(all|every)|sabhi|sab\s*(dikhao|batao)|sare/.test(text) ||
      (/(show|get|list|display|fetch|find|select|dikhao|batao)/.test(text) && /\*|everything|all\s*(data|of)?/.test(text))) {
    return { sql: `SELECT * FROM ${targetTable};`, explanation: `Showing all records from ${targetTable}` };
  }

  // COUNT
  if (/how\s*many|count|total\s*(number|count)|kitne|kitni/.test(text)) {
    const col = findColumn(text);
    if (/where|with|having|jinka|jisme|whose|who\s*(have|has|are|is)|greater|less|more|above|below|equal|zyada|kam/.test(text)) {
      const condResult = extractCondition(text, colNames, colMap);
      if (condResult) {
        return { sql: `SELECT COUNT(*) as total FROM ${targetTable} WHERE ${condResult.condition};`, explanation: `Counting records in ${targetTable} where ${condResult.readable}` };
      }
    }
    if (col) {
      return { sql: `SELECT ${col}, COUNT(*) as count FROM ${targetTable} GROUP BY ${col};`, explanation: `Counting records grouped by ${col} in ${targetTable}` };
    }
    return { sql: `SELECT COUNT(*) as total FROM ${targetTable};`, explanation: `Counting total records in ${targetTable}` };
  }

  // AVERAGE / MEAN
  if (/average|avg|mean|average\s*of|औसत/.test(text)) {
    const col = findColumn(text);
    if (col) {
      const groupCol = colNames.find(c => c !== col.toLowerCase() && text.includes(c));
      if (groupCol) {
        return { sql: `SELECT ${colMap.get(groupCol)}, AVG(${col}) as average_${col.toLowerCase()} FROM ${targetTable} GROUP BY ${colMap.get(groupCol)};`, explanation: `Average ${col} grouped by ${colMap.get(groupCol)}` };
      }
      return { sql: `SELECT AVG(${col}) as average_${col.toLowerCase()} FROM ${targetTable};`, explanation: `Average of ${col} in ${targetTable}` };
    }
    return { sql: `SELECT * FROM ${targetTable};`, explanation: `Couldn't determine which column to average. Showing all data.` };
  }

  // MAX / HIGHEST / LARGEST
  if (/max(imum)?|highest|largest|biggest|most|top|sabse\s*(bada|zyada|jyada)|greatest/.test(text)) {
    const col = findColumn(text);
    if (col) {
      if (/who|which|whose|kaun|kiska/.test(text)) {
        return { sql: `SELECT * FROM ${targetTable} ORDER BY ${col} DESC LIMIT 1;`, explanation: `Record with the highest ${col} in ${targetTable}` };
      }
      return { sql: `SELECT MAX(${col}) as max_${col.toLowerCase()} FROM ${targetTable};`, explanation: `Maximum ${col} in ${targetTable}` };
    }
    // "top N" pattern
    const topMatch = text.match(/top\s*(\d+)/);
    if (topMatch) {
      const numCol = colNames.find(c => {
        const info = targetTableInfo?.columns.find(cc => cc.name.toLowerCase() === c);
        return info && /int|real|float|number|numeric/i.test(info.type);
      });
      if (numCol) {
        return { sql: `SELECT * FROM ${targetTable} ORDER BY ${colMap.get(numCol)} DESC LIMIT ${topMatch[1]};`, explanation: `Top ${topMatch[1]} records by ${colMap.get(numCol)}` };
      }
      return { sql: `SELECT * FROM ${targetTable} LIMIT ${topMatch[1]};`, explanation: `First ${topMatch[1]} records from ${targetTable}` };
    }
    return { sql: `SELECT * FROM ${targetTable};`, explanation: 'Showing all data' };
  }

  // MIN / LOWEST / SMALLEST
  if (/min(imum)?|lowest|smallest|least|sabse\s*(chota|kam)/.test(text)) {
    const col = findColumn(text);
    if (col) {
      if (/who|which|whose|kaun|kiska/.test(text)) {
        return { sql: `SELECT * FROM ${targetTable} ORDER BY ${col} ASC LIMIT 1;`, explanation: `Record with the lowest ${col} in ${targetTable}` };
      }
      return { sql: `SELECT MIN(${col}) as min_${col.toLowerCase()} FROM ${targetTable};`, explanation: `Minimum ${col} in ${targetTable}` };
    }
  }

  // SUM / TOTAL
  if (/sum|total\s*(of|value)|jod|kul/.test(text)) {
    const col = findColumn(text);
    if (col) {
      return { sql: `SELECT SUM(${col}) as total_${col.toLowerCase()} FROM ${targetTable};`, explanation: `Sum of ${col} in ${targetTable}` };
    }
  }

  // GROUP BY pattern
  if (/group\s*by|per\s+each|for\s+each|by\s+each|each|category|group|wise/.test(text)) {
    const col = findColumn(text);
    if (col) {
      return { sql: `SELECT ${col}, COUNT(*) as count FROM ${targetTable} GROUP BY ${col} ORDER BY count DESC;`, explanation: `Records grouped by ${col} in ${targetTable}` };
    }
  }

  // ORDER / SORT
  if (/sort|order|arrange|kram/.test(text)) {
    const col = findColumn(text);
    const dir = /desc|descending|high.*low|bade.*chote|reverse|ulta/.test(text) ? 'DESC' : 'ASC';
    if (col) {
      return { sql: `SELECT * FROM ${targetTable} ORDER BY ${col} ${dir};`, explanation: `Records sorted by ${col} (${dir === 'DESC' ? 'descending' : 'ascending'})` };
    }
    return { sql: `SELECT * FROM ${targetTable} ORDER BY 1 ${dir};`, explanation: `Records sorted ${dir === 'DESC' ? 'descending' : 'ascending'}` };
  }

  // WHERE / FILTER conditions
  if (/where|with|filter|find|whose|who\s*(have|has|are|is|was)|jinka|jisme|jiska|greater|less|more|above|below|equal|between|like|contains|older|younger|zyada|kam|naam|name\s*is/.test(text)) {
    const condResult = extractCondition(text, colNames, colMap);
    if (condResult) {
      return { sql: `SELECT * FROM ${targetTable} WHERE ${condResult.condition};`, explanation: `Records from ${targetTable} where ${condResult.readable}` };
    }
  }

  // DISTINCT / UNIQUE
  if (/distinct|unique|different|alag\s*alag/.test(text)) {
    const col = findColumn(text);
    if (col) {
      return { sql: `SELECT DISTINCT ${col} FROM ${targetTable};`, explanation: `Unique values of ${col} in ${targetTable}` };
    }
    return { sql: `SELECT DISTINCT * FROM ${targetTable};`, explanation: `Distinct records from ${targetTable}` };
  }

  // DELETE
  if (/delete|remove|hata(o|do)|nikalo/.test(text)) {
    const condResult = extractCondition(text, colNames, colMap);
    if (condResult) {
      return { sql: `DELETE FROM ${targetTable} WHERE ${condResult.condition};`, explanation: `Delete records from ${targetTable} where ${condResult.readable}` };
    }
    return { sql: `-- Please specify which records to delete\n-- Example: DELETE FROM ${targetTable} WHERE id = 1;`, explanation: 'Please specify a condition for deletion to avoid removing all data.' };
  }

  // INSERT
  if (/insert|add\s*(a\s*)?(new|record|row|entry|data)|jodo|dalo/.test(text)) {
    const cols = targetTableInfo?.columns.map(c => c.name) || [];
    return { sql: `INSERT INTO ${targetTable} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')});`, explanation: `Insert template for ${targetTable}. Replace ? with actual values.` };
  }

  // UPDATE
  if (/update|change|modify|set|badlo/.test(text)) {
    const condResult = extractCondition(text, colNames, colMap);
    const col = findColumn(text);
    if (col && condResult) {
      return { sql: `UPDATE ${targetTable} SET ${col} = ? WHERE ${condResult.condition};`, explanation: `Update ${col} in ${targetTable} where ${condResult.readable}. Replace ? with new value.` };
    }
    return { sql: `-- UPDATE ${targetTable} SET column = value WHERE condition;`, explanation: 'Specify which column to update and a condition.' };
  }

  // TABLES / SCHEMA
  if (/tables?|schema|structure|describe|columns?|fields?|dhancha/.test(text)) {
    if (/all\s*tables?|list.*tables?|show.*tables?|what\s*tables?/.test(text)) {
      return { sql: `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`, explanation: 'Listing all tables in the database' };
    }
    return { sql: `PRAGMA table_info('${targetTable}');`, explanation: `Schema/structure of table ${targetTable}` };
  }

  // LIMIT
  const limitMatch = text.match(/(?:first|last|limit|show\s+me)\s*(\d+)/);
  if (limitMatch) {
    const n = limitMatch[1];
    const isLast = /last/.test(text);
    if (isLast) {
      return { sql: `SELECT * FROM ${targetTable} ORDER BY rowid DESC LIMIT ${n};`, explanation: `Last ${n} records from ${targetTable}` };
    }
    return { sql: `SELECT * FROM ${targetTable} LIMIT ${n};`, explanation: `First ${n} records from ${targetTable}` };
  }

  // SPECIFIC COLUMNS 
  if (/show\s*(me\s*)?(the\s*)?(only\s*)?/.test(text)) {
    const mentionedCols = colNames.filter(c => text.includes(c));
    if (mentionedCols.length > 0) {
      const mappedCols = mentionedCols.map(c => colMap.get(c) || c);
      return { sql: `SELECT ${mappedCols.join(', ')} FROM ${targetTable};`, explanation: `Showing ${mappedCols.join(', ')} from ${targetTable}` };
    }
  }

  // Default: show all
  return { sql: `SELECT * FROM ${targetTable};`, explanation: `Showing all records from ${targetTable}` };
}

function extractCondition(
  text: string,
  colNames: string[],
  colMap: Map<string, string>
): { condition: string; readable: string } | null {
  // Find mentioned column
  let col = '';
  for (const c of colNames) {
    if (text.includes(c)) { col = colMap.get(c) || c; break; }
  }
  if (!col) return null;

  // NUMBER comparisons
  const numMatch = text.match(/(\d+(\.\d+)?)/);
  const numVal = numMatch ? numMatch[1] : null;

  if (numVal) {
    if (/greater\s*than|more\s*than|above|over|exceed|bigger|zyada|>|older\s*than/.test(text)) {
      return { condition: `${col} > ${numVal}`, readable: `${col} > ${numVal}` };
    }
    if (/less\s*than|below|under|smaller|kam|<|younger\s*than/.test(text)) {
      return { condition: `${col} < ${numVal}`, readable: `${col} < ${numVal}` };
    }
    if (/greater\s*than\s*or\s*equal|at\s*least|>=/.test(text)) {
      return { condition: `${col} >= ${numVal}`, readable: `${col} >= ${numVal}` };
    }
    if (/less\s*than\s*or\s*equal|at\s*most|<=/.test(text)) {
      return { condition: `${col} <= ${numVal}`, readable: `${col} <= ${numVal}` };
    }
    if (/equal|equals?|is|=|hai|hain/.test(text)) {
      return { condition: `${col} = ${numVal}`, readable: `${col} = ${numVal}` };
    }
    if (/not\s*equal|!=|<>|nahi|nhi/.test(text)) {
      return { condition: `${col} != ${numVal}`, readable: `${col} != ${numVal}` };
    }
    // between
    const betweenMatch = text.match(/between\s*(\d+)\s*(and|to|&|-)\s*(\d+)/);
    if (betweenMatch) {
      return { condition: `${col} BETWEEN ${betweenMatch[1]} AND ${betweenMatch[3]}`, readable: `${col} between ${betweenMatch[1]} and ${betweenMatch[3]}` };
    }
    // Default for number: equals
    return { condition: `${col} = ${numVal}`, readable: `${col} = ${numVal}` };
  }

  // STRING comparisons
  const strMatch = text.match(/(?:is|=|named?|called?|like|contains?|naam|equal)\s*['"]?([a-zA-Z][a-zA-Z\s]*?)['"]?\s*$/);
  if (strMatch) {
    const val = strMatch[1].trim();
    if (/like|contains?/.test(text)) {
      return { condition: `${col} LIKE '%${val}%'`, readable: `${col} contains "${val}"` };
    }
    return { condition: `${col} = '${val}'`, readable: `${col} = "${val}"` };
  }

  // Check for quoted strings anywhere
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  if (quotedMatch) {
    if (/like|contains?/.test(text)) {
      return { condition: `${col} LIKE '%${quotedMatch[1]}%'`, readable: `${col} contains "${quotedMatch[1]}"` };
    }
    return { condition: `${col} = '${quotedMatch[1]}'`, readable: `${col} = "${quotedMatch[1]}"` };
  }

  return null;
}

// ─── Suggestions ───────────────────────────────────────────────────────────────

function getSuggestions(tables: AIChatBotProps['tables']): string[] {
  if (tables.length === 0) return ['Show all tables', 'Create a new table'];
  const t = tables[0];
  const cols = t.columns.map(c => c.name);
  const numCol = t.columns.find(c => /int|real|float|number/i.test(c.type));
  const strCol = t.columns.find(c => /text|varchar|char/i.test(c.type));

  const suggestions = [
    `Show all ${t.name}`,
    `How many records in ${t.name}?`,
  ];
  if (numCol) {
    suggestions.push(`Average ${numCol.name} in ${t.name}`);
    suggestions.push(`Who has the highest ${numCol.name}?`);
    suggestions.push(`${t.name} with ${numCol.name} greater than 20`);
  }
  if (strCol) {
    suggestions.push(`Show ${strCol.name} from ${t.name}`);
  }
  if (cols.length > 1) {
    suggestions.push(`Count ${t.name} group by ${cols[cols.length - 1]}`);
  }
  suggestions.push(`Sort ${t.name} by ${cols[0]}`);
  suggestions.push('Mujhe SQL sikhayo step by step');
  suggestions.push('SQL nahi aati, simple example do');
  suggestions.push(`Run this SQL: SELECT * FROM ${t.name} LIMIT 10;`);
  return suggestions;
}

function extractSqlFromInput(input: string): string | null {
  const match = input.match(/(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA|EXPLAIN)[\s\S]*$/i);
  return match ? match[0].trim() : null;
}

function detectLearningIntent(text: string): boolean {
  return /sql\s*(nahi|nahin|not\s*know|don'?t\s*know|new|beginner|basic)|teach\s*me\s*sql|learn\s*sql|sql\s*(seekh|sikha|samjha|samjhao)|how\s*to\s*write\s*sql|sql\s*kya\s*hai/.test(text);
}

function detectHelpIntent(text: string): boolean {
  return /help|what\s*can\s*you\s*do|commands?|examples?|guide|kaise\s*kare|kya\s*kar\s*sakte\s*ho/.test(text);
}

function detectExplainQueryIntent(text: string): boolean {
  return /(explain|samjha|samjhao|matlab|meaning|break\s*down)\s*(this|query|sql)?/.test(text);
}

function detectDirectSQLIntent(input: string): boolean {
  const trimmed = input.trim();
  return /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA|EXPLAIN|WITH|BEGIN|COMMIT|ROLLBACK)\b/i.test(trimmed);
}

function buildTipsForSQL(sql?: string): string[] {
  if (!sql) {
    return [
      'SELECT se data dekhte hain.',
      'WHERE se filter lagta hai.',
      'GROUP BY se summary banati hai.',
      'ORDER BY se sorting hoti hai.',
    ];
  }

  const upperSql = sql.toUpperCase();
  const tips: string[] = [];

  if (upperSql.startsWith('SELECT')) tips.push('SELECT ka use data fetch karne ke liye hota hai.');
  if (upperSql.includes('WHERE')) tips.push('WHERE condition rows ko filter karti hai.');
  if (upperSql.includes('GROUP BY')) tips.push('GROUP BY category-wise aggregation banata hai.');
  if (upperSql.includes('ORDER BY')) tips.push('ORDER BY results ko ASC/DESC me sort karta hai.');
  if (upperSql.includes('LIMIT')) tips.push('LIMIT sirf top N rows return karta hai.');
  if (upperSql.includes('JOIN')) tips.push('JOIN multiple tables ko common key par combine karta hai.');

  if (tips.length === 0) {
    tips.push('Is query ko run karne se pehle table name aur columns verify kar lo.');
  }

  return tips.slice(0, 4);
}

function buildFollowUps(tables: AIChatBotProps['tables'], sql?: string): string[] {
  if (tables.length === 0) {
    return ['Show all tables', 'Create a sample table with 3 columns'];
  }

  const t = tables[0];
  const next: string[] = [];

  if (sql && sql.toUpperCase().startsWith('SELECT')) {
    next.push(`Explain this SQL: ${sql}`);
    next.push(`Show first 10 rows from ${t.name}`);
    next.push(`Count records in ${t.name}`);
  } else if (sql && /INSERT|UPDATE|DELETE/i.test(sql)) {
    next.push(`Show all ${t.name}`);
    next.push(`How many records in ${t.name}?`);
  } else {
    next.push(`Show all ${t.name}`);
    next.push(`How many records in ${t.name}?`);
    next.push(`Sort ${t.name} by ${t.columns[0]?.name || 'id'}`);
  }

  return next.slice(0, 3);
}

function buildAssistantPlan(input: string, tables: AIChatBotProps['tables']): AssistantPlan {
  const text = normalizeText(input);
  const trimmedInput = input.trim();

  if (tables.length === 0) {
    return {
      explanation: 'Abhi database me koi table nahi mila. Pehle ek table create ya import karo, phir main step-by-step SQL me help karunga.',
      shouldExecute: false,
      intentLabel: 'Setup Help',
      confidence: 'High',
      tips: buildTipsForSQL(),
      followUps: ['Create a sample table', 'Import CSV file', 'Show all tables'],
    };
  }

  const primaryTable = tables[0];

  if (detectLearningIntent(text)) {
    const sampleSql = `SELECT * FROM ${primaryTable.name} LIMIT 5;`;
    return {
      explanation: `Bilkul tension mat lo. SQL nahi aati to bhi main help karunga. Maine start ke liye ek simple query banayi hai jo ${primaryTable.name} table ka sample data dikhayegi. Isse hum step-by-step SELECT, WHERE, GROUP BY samjhenge.`,
      sql: sampleSql,
      shouldExecute: true,
      intentLabel: 'SQL Coach',
      confidence: 'High',
      tips: [
        'Step 1: SELECT * FROM table se raw data dekho.',
        'Step 2: WHERE lagake filter karo.',
        'Step 3: GROUP BY se summary banao.',
        'Step 4: ORDER BY se results sort karo.',
      ],
      followUps: [
        `Teach me WHERE with ${primaryTable.name}`,
        `Teach me GROUP BY with ${primaryTable.name}`,
        `Explain this SQL: ${sampleSql}`,
      ],
    };
  }

  if (detectHelpIntent(text)) {
    return {
      explanation: 'Main natural language ko SQL me convert karta hoon, query run karta hoon, result aur charts dikhata hoon. Tum normal sentence me pucho, SQL likhna zaroori nahi.',
      shouldExecute: false,
      intentLabel: 'Assistant Help',
      confidence: 'High',
      tips: [
        'Example: "How many records in students"',
        'Example: "Show top 10 rows from courses"',
        'Example: "Average score group by subject"',
        'Direct SQL mode: apni SQL query seedhi paste karo.',
      ],
      followUps: [
        `Show all ${primaryTable.name}`,
        `How many records in ${primaryTable.name}?`,
        'Mujhe SQL sikhayo step by step',
      ],
    };
  }

  if (detectDirectSQLIntent(trimmedInput)) {
    const explainPrompt = trimmedInput.length <= 120
      ? `Explain this SQL: ${trimmedInput}`
      : 'Explain this SQL in simple words';

    return {
      explanation: 'Direct SQL mode detect ho gaya. Main is query ko exactly waise hi run kar raha hoon jaisa tumne likha hai.',
      sql: trimmedInput,
      shouldExecute: true,
      intentLabel: 'Direct SQL',
      confidence: 'High',
      tips: buildTipsForSQL(trimmedInput),
      followUps: [
        explainPrompt,
        'Is query ka safer read-only version do',
        'Is query ko optimize karo',
      ],
    };
  }

  if (detectExplainQueryIntent(text)) {
    const extractedSql = extractSqlFromInput(input);
    if (extractedSql) {
      return {
        explanation: 'Is SQL ka breakdown: SELECT columns choose karta hai, FROM table choose karta hai, WHERE filter karta hai, GROUP BY summary banata hai, ORDER BY sorting karta hai. Neeche exact query bhi dikh rahi hai.',
        sql: extractedSql,
        shouldExecute: false,
        intentLabel: 'SQL Explanation',
        confidence: 'High',
        tips: buildTipsForSQL(extractedSql),
        followUps: [
          'Run this query now',
          `Show simpler version of: ${extractedSql}`,
          'Mujhe is query ka beginner version do',
        ],
      };
    }
  }

  const { sql, explanation } = generateSQL(input, tables);
  const isCommentPlan = sql.trim().startsWith('--');

  return {
    explanation: `${explanation}. Maine query ko execute karke result bhi la raha hoon taaki tumhe direct output samajh aaye.`,
    sql,
    shouldExecute: !isCommentPlan,
    intentLabel: 'Query Generation',
    confidence: isCommentPlan ? 'Medium' : 'High',
    tips: buildTipsForSQL(sql),
    followUps: buildFollowUps(tables, sql),
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AIChatBot({ onExecuteSQL, tables }: AIChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = getSuggestions(tables);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const executeSQLPlan = async (sql: string): Promise<QueryResult> => {
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    if (statements.length <= 1) {
      return onExecuteSQL(sql);
    }

    let lastResult: QueryResult | null = null;
    let totalRowsAffected = 0;
    let lastData: Record<string, any>[] | undefined;

    for (let i = 0; i < statements.length; i += 1) {
      const statement = statements[i];
      const statementResult = await onExecuteSQL(`${statement};`);

      if (!statementResult.success) {
        return {
          ...statementResult,
          message: `Statement ${i + 1} failed: ${statementResult.message}`,
        };
      }

      totalRowsAffected += statementResult.rowsAffected || 0;
      if (statementResult.data) {
        lastData = statementResult.data;
      }
      lastResult = statementResult;
    }

    return {
      success: true,
      message: `${statements.length} statements executed successfully.`,
      data: lastData,
      executionTime: lastResult?.executionTime,
      rowsAffected: totalRowsAffected,
    };
  };

  const processMessage = async (userText: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);
    setShowSuggestions(false);

    // Simulate thinking delay
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

    const plan = buildAssistantPlan(userText, tables);

    // Execute the SQL
    let result: QueryResult | null = null;
    if (plan.sql && plan.shouldExecute) {
      try {
        result = await executeSQLPlan(plan.sql);
      } catch {
        result = { success: false, message: 'Failed to execute query' };
      }
    }

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: plan.explanation,
      sql: plan.sql,
      result,
      intentLabel: plan.intentLabel,
      confidence: plan.confidence,
      tips: plan.tips,
      followUps: plan.followUps,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMsg]);
    setIsProcessing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    processMessage(input.trim());
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isProcessing) return;
      processMessage(input.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    processMessage(suggestion);
  };

  const handleClearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)] max-h-[750px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-white/[0.06] bg-white/[0.02] rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25 animate-pulse-glow">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              AI SQL Assistant
              <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 border border-violet-500/30">
                Smart
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">Ask in plain language, get SQL + coaching + result charts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-4 md:space-y-5 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fadeInUp">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/10 flex items-center justify-center mb-5 border border-violet-500/15">
              <Wand2 className="w-10 h-10 text-violet-400" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2">Ask me anything about your data</h3>
            <p className="text-xs md:text-sm text-slate-500 max-w-md mb-6">
              Type in normal English or Hindi. Even if you do not know SQL, I will teach step-by-step and run safe queries for you.
            </p>

            {/* Available tables info */}
            {tables.length > 0 && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-left max-w-md w-full">
                <p className="text-xs font-medium text-indigo-300 mb-2 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Available Tables
                </p>
                <div className="flex flex-wrap gap-2">
                  {tables.map(t => (
                    <span key={t.name} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-[11px] text-indigo-300 border border-indigo-500/20 font-mono">
                      {t.name} ({t.columns.length} cols)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="w-full max-w-lg">
                <p className="text-xs text-slate-600 mb-3">Try asking:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestions.slice(0, 6).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-left px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] 
                        hover:border-violet-500/30 hover:bg-violet-500/5 
                        transition-all duration-200 text-xs text-slate-400 hover:text-violet-300 group"
                    >
                      <Sparkles className="w-3 h-3 inline mr-1.5 text-violet-500/50 group-hover:text-violet-400" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''} animate-fadeInUp`}>
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-md shadow-violet-500/20 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <div className={`max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
              {msg.role === 'user' ? (
                /* User message */
                <div className="px-4 py-3 rounded-2xl rounded-tr-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm shadow-lg shadow-indigo-500/20">
                  {msg.text}
                </div>
              ) : (
                /* Assistant message */
                <div className="space-y-3">
                  {(msg.intentLabel || msg.confidence) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {msg.intentLabel && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          Intent: {msg.intentLabel}
                        </span>
                      )}
                      {msg.confidence && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Confidence: {msg.confidence}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white/[0.04] border border-white/[0.08] text-sm text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 inline text-violet-400 mr-1.5" />
                    {msg.text}
                  </div>

                  {/* SQL tips */}
                  {msg.tips && msg.tips.length > 0 && (
                    <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 px-4 py-3">
                      <p className="text-[11px] font-semibold text-violet-300 mb-2">SQL Coach Tips</p>
                      <div className="space-y-1.5">
                        {msg.tips.map((tip, tipIndex) => (
                          <p key={tipIndex} className="text-xs text-slate-300">
                            {tipIndex + 1}. {tip}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated SQL */}
                  {msg.sql && (
                    <div className="rounded-xl bg-[#0c0c24] border border-indigo-500/15 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-indigo-500/5 border-b border-indigo-500/10">
                        <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1.5">
                          <Database className="w-3 h-3" />
                          Generated SQL
                        </span>
                        <button
                          onClick={() => copyToClipboard(msg.sql!)}
                          className="p-1 rounded text-slate-600 hover:text-indigo-300 transition-colors"
                          title="Copy SQL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <pre className="px-4 py-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                        {msg.sql}
                      </pre>
                    </div>
                  )}

                  {/* Query Result */}
                  {msg.result && (
                    <div className="space-y-3">
                      {/* Status */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs
                        ${msg.result.success
                          ? 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/10 border border-red-500/15 text-red-400'
                        }`}>
                        {msg.result.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {msg.result.message}
                        {msg.result.executionTime !== undefined && (
                          <span className="ml-auto flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3" /> {msg.result.executionTime}ms
                          </span>
                        )}
                      </div>

                      {/* Data charts */}
                      {msg.result.data && msg.result.data.length > 0 && (
                        <ResultCharts data={msg.result.data} />
                      )}
                    </div>
                  )}

                  {msg.followUps && msg.followUps.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {msg.followUps.map((followUp, followUpIndex) => (
                        <button
                          key={`${msg.id}-follow-${followUpIndex}`}
                          onClick={() => handleSuggestionClick(followUp)}
                          className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 hover:bg-indigo-500/15 transition-colors"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-slate-700 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20 mt-1">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Thinking indicator */}
        {isProcessing && (
          <div className="flex gap-3 animate-fadeInUp">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white/[0.04] border border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                <span className="text-sm text-slate-400">Analyzing your query...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggestion pills (after first message) */}
      {messages.length > 0 && !isProcessing && (
        <div className="px-6 py-2 border-t border-white/[0.04] flex gap-2 overflow-x-auto scrollbar-none">
          {suggestions.slice(0, 4).map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(s)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] 
                text-[11px] text-slate-500 hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
            >
              <Sparkles className="w-2.5 h-2.5 inline mr-1" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-3 md:px-6 py-3 md:py-4 border-t border-white/[0.06] bg-white/[0.02] rounded-b-2xl">
        <div className="flex items-end gap-2 md:gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              rows={3}
              placeholder='Ask in English/Hindi ya direct SQL paste karo...'
              disabled={isProcessing}
              className="w-full resize-none px-4 md:px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]
                text-sm text-white placeholder-slate-600
                focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/15 focus:bg-white/[0.06]
                disabled:opacity-50 transition-all duration-300 min-h-[88px] max-h-[220px]"
            />
            <MessageSquare className="absolute right-4 top-4 w-4 h-4 text-slate-700 hidden md:block" />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600
              hover:from-violet-500 hover:to-fuchsia-500
              disabled:opacity-40 disabled:cursor-not-allowed
              shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40
              flex items-center justify-center transition-all duration-300
              transform hover:scale-[1.05] active:scale-[0.95]"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-600">
          Tip: <span className="text-slate-500">Enter</span> to send, <span className="text-slate-500">Shift+Enter</span> for new line. Direct SQL bhi run hota hai.
        </p>
      </form>
    </div>
  );
}
