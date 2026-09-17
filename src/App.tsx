import React, { useState } from 'react';
import { SearchTab } from './components/SearchTab';
import { CalculatorTab } from './components/CalculatorTab';
import Inventory from './components/Inventory';

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'calculator' | 'batches' | 'inventory'>('search');

  return (
    <div className="min-h-screen bg-[#F9F7F1] text-neutral-900 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8 text-center space-y-1">
        <h1 className="text-3xl font-serif font-bold tracking-tight">The Scent Handbook</h1>
        <p className="text-sm text-neutral-500 font-mono">
          Search · Calculator · Batches · Inventory
        </p>
      </header>

      {/* Navigation */}
      <nav className="max-w-4xl mx-auto mb-8 border-b border-neutral-300 flex justify-center space-x-8 text-sm font-medium">
        {(['search', 'calculator', 'batches', 'inventory'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-neutral-900 text-neutral-900 font-semibold'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main className="max-w-4xl mx-auto">
        {activeTab === 'search' && <SearchTab />}
        {activeTab === 'calculator' && <CalculatorTab />}
        {activeTab === 'batches' && (
          <div className="text-center py-12 text-neutral-500 text-sm">Batches view operational.</div>
        )}
        {activeTab === 'inventory' && <Inventory />}
      </main>
    </div>
  );
}
