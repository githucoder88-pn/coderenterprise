/**
 * AST Parser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AstParser } from '../../../workspace/editors/ast-parser.js';

describe('AstParser', () => {
  let parser: AstParser;

  beforeEach(() => {
    parser = new AstParser();
  });

  describe('TypeScript', () => {
    const tsCode = `
import { useState } from 'react';

interface UserProps {
  name: string;
  age: number;
}

export class UserService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getUser(id: string): Promise<User | null> {
    return this.db.find(id);
  }

  static createDefault(): UserService {
    return new UserService(null);
  }
}

export function greet(user: UserProps): string {
  return \`Hello, \${user.name}\`;
}

export const multiply = (a: number, b: number): number => a * b;
`;

    it('should extract functions', () => {
      const result = parser.parse(tsCode, 'typescript', 'test.ts');
      const fns = result.symbols.filter((s) => s.kind === 'function');
      expect(fns.length).toBeGreaterThanOrEqual(2);
      expect(fns.some((f) => f.name === 'greet')).toBe(true);
    });

    it('should extract classes', () => {
      const result = parser.parse(tsCode, 'typescript', 'test.ts');
      const classes = result.symbols.filter((s) => s.kind === 'class');
      expect(classes.length).toBeGreaterThanOrEqual(1);
      expect(classes[0]!.name).toBe('UserService');
    });

    it('should extract interfaces', () => {
      const result = parser.parse(tsCode, 'typescript', 'test.ts');
      const interfaces = result.symbols.filter((s) => s.kind === 'interface');
      expect(interfaces.length).toBeGreaterThanOrEqual(1);
      expect(interfaces.some((i) => i.name === 'UserProps')).toBe(true);
    });

    it('should extract imports', () => {
      const result = parser.parse(tsCode, 'typescript', 'test.ts');
      expect(result.imports.length).toBeGreaterThanOrEqual(1);
      expect(result.imports[0]!.source).toBe('react');
    });

    it('should extract exports', () => {
      const result = parser.parse(tsCode, 'typescript', 'test.ts');
      expect(result.exports.length).toBeGreaterThanOrEqual(2);
    });

    it('should count lines', () => {
      const result = parser.parse(tsCode, 'typescript', 'test.ts');
      expect(result.lineCount).toBe(tsCode.split('\n').length);
    });
  });

  describe('Python', () => {
    const pyCode = `import os
from typing import List, Optional

class Calculator:
    """A simple calculator class."""

    def add(self, a: int, b: int) -> int:
        return a + b

    def subtract(self, a: int, b: int) -> int:
        return a - b

def process_items(items: List[str]) -> None:
    for item in items:
        print(item)

async def fetch_data(url: str) -> Optional[dict]:
    pass
`;

    it('should extract Python functions', () => {
      const result = parser.parse(pyCode, 'python', 'test.py');
      const fns = result.symbols.filter((s) => s.kind === 'function');
      expect(fns.some((f) => f.name === 'process_items')).toBe(true);
      expect(fns.some((f) => f.name === 'fetch_data')).toBe(true);
    });

    it('should extract Python classes', () => {
      const result = parser.parse(pyCode, 'python', 'test.py');
      const classes = result.symbols.filter((s) => s.kind === 'class');
      expect(classes.length).toBeGreaterThanOrEqual(1);
      expect(classes[0]!.name).toBe('Calculator');
    });

    it('should extract Python imports', () => {
      const result = parser.parse(pyCode, 'python', 'test.py');
      expect(result.imports.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Rust', () => {
    const rustCode = `use std::collections::HashMap;

pub struct Config {
    name: String,
    value: i32,
}

pub trait Serializable {
    fn serialize(&self) -> String;
}

pub fn process(data: Vec<u8>) -> Result<String, Error> {
    Ok(String::from("ok"))
}
`;

    it('should extract Rust structs', () => {
      const result = parser.parse(rustCode, 'rust', 'test.rs');
      const structs = result.symbols.filter((s) => s.kind === 'class');
      expect(structs.some((s) => s.name === 'Config')).toBe(true);
    });

    it('should extract Rust functions', () => {
      const result = parser.parse(rustCode, 'rust', 'test.rs');
      expect(result.symbols.some((s) => s.name === 'process')).toBe(true);
    });

    it('should extract Rust traits as interfaces', () => {
      const result = parser.parse(rustCode, 'rust', 'test.rs');
      expect(result.symbols.some((s) => s.name === 'Serializable' && s.kind === 'interface')).toBe(true);
    });
  });

  describe('Go', () => {
    const goCode = `package main

import "fmt"

type Server struct {
    host string
    port int
}

func (s *Server) Start() error {
    return nil
}

func NewServer(host string, port int) *Server {
    return &Server{host: host, port: port}
}
`;

    it('should extract Go functions', () => {
      const result = parser.parse(goCode, 'go', 'main.go');
      expect(result.symbols.some((s) => s.name === 'NewServer')).toBe(true);
    });

    it('should extract Go types', () => {
      const result = parser.parse(goCode, 'go', 'main.go');
      expect(result.symbols.some((s) => s.name === 'Server')).toBe(true);
    });
  });

  describe('findSymbol', () => {
    it('should find a symbol by name', () => {
      const code = 'function hello() { return "hi"; }\nfunction goodbye() { return "bye"; }';
      const result = parser.findSymbol(code, 'typescript', 'test.ts', 'hello');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('hello');
    });

    it('should return null for missing symbol', () => {
      const code = 'function hello() { }';
      expect(parser.findSymbol(code, 'typescript', 'test.ts', 'missing')).toBeNull();
    });
  });

  describe('findByKind', () => {
    it('should filter by symbol kind', () => {
      const code = `
class Foo {}
function bar() {}
interface Baz {}
`;
      const fns = parser.findByKind(code, 'typescript', 'test.ts', 'function');
      expect(fns.length).toBe(1);
      expect(fns[0]!.name).toBe('bar');
    });
  });

  describe('language support', () => {
    it('should handle all 10 languages without errors', () => {
      const languages = ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'c', 'cpp', 'csharp', 'kotlin'] as const;
      for (const lang of languages) {
        const code = getSampleCode(lang);
        expect(() => parser.parse(code, lang, `test.${lang}`)).not.toThrow();
      }
    });
  });
});

function getSampleCode(lang: string): string {
  const samples: Record<string, string> = {
    typescript: 'function hello(): string { return "hi"; }',
    javascript: 'function hello() { return "hi"; }',
    python: 'def hello():\n    return "hi"',
    rust: 'pub fn hello() -> String { String::from("hi") }',
    go: 'func hello() string { return "hi" }',
    java: 'public String hello() { return "hi"; }',
    c: 'char* hello() { return "hi"; }',
    cpp: 'std::string hello() { return "hi"; }',
    csharp: 'public string Hello() { return "hi"; }',
    kotlin: 'fun hello(): String { return "hi" }',
  };
  return samples[lang] ?? '// empty';
}
