import React, { useState } from 'react';
import type { Member } from '../../lib/services/types';

interface DivisionModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  members: Member[];
  selectedParticipants: string[];
  onApply: (splits: Record<string, number>, type: 'equal' | 'percent' | 'custom' | 'each') => void;
  displayNameFor: (userId: string) => string;
}

const divisionTypes = [
  { key: 'equal', label: 'A partes iguales', icon: '🟰' },
  { key: 'percent', label: 'Por porcentaje', icon: '📊' },
  { key: 'custom', label: 'Por monto', icon: '💵' },
  { key: 'each', label: 'Cada uno paga su parte', icon: '👤' },
];

export default function DivisionModal({ open, onClose, amount, members, selectedParticipants, onApply, displayNameFor }: DivisionModalProps) {
  const [type, setType] = useState<'equal' | 'percent' | 'custom' | 'each'>('equal');
  const [splits, setSplits] = useState<Record<string, number>>(() => {
    const eq = amount / selectedParticipants.length;
    const obj: Record<string, number> = {};
    selectedParticipants.forEach(id => { obj[id] = eq; });
    return obj;
  });
  const [percents, setPercents] = useState<Record<string, number>>(() => {
    const percent = 100 / selectedParticipants.length;
    const obj: Record<string, number> = {};
    selectedParticipants.forEach(id => { obj[id] = percent; });
    return obj;
  });

  // Actualiza splits cuando cambian participantes o tipo
  React.useEffect(() => {
    if (type === 'equal') {
      const eq = amount / selectedParticipants.length;
      const obj: Record<string, number> = {};
      selectedParticipants.forEach(id => { obj[id] = eq; });
      setSplits(obj);
    }
    if (type === 'percent') {
      const percent = 100 / selectedParticipants.length;
      const obj: Record<string, number> = {};
      selectedParticipants.forEach(id => { obj[id] = percent; });
      setPercents(obj);
    }
    if (type === 'each') {
      const eq = amount / selectedParticipants.length;
      const obj: Record<string, number> = {};
      selectedParticipants.forEach(id => { obj[id] = eq; });
      setSplits(obj);
    }
  }, [type, selectedParticipants, amount]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-opacity duration-300 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transition-transform duration-300 animate-slideUp
        sm:max-w-lg sm:p-8
        md:max-w-xl md:p-10
        " style={{maxHeight: '90vh', overflowY: 'auto'}}>
  <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">⚡ Opciones de división</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
        </div>
  <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {divisionTypes.map(opt => (
            <button
              key={opt.key}
              className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all text-sm font-medium ${type === opt.key ? 'bg-teal-100 border-teal-500 text-teal-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
              onClick={() => setType(opt.key as any)}
            >
              <span className="text-xl mb-1">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
  <div className="space-y-4">
          {/* Igual */}
          {type === 'equal' && (
            <div>
              <div className="mb-2 text-gray-600">Dividir a partes iguales</div>
              {selectedParticipants.map(id => {
                const member = members.find(m => m.user_id === id);
                if (!member) return null;
                return (
                  <div key={id} className="flex items-center gap-3 mb-2 transition-all duration-200 bg-white hover:bg-teal-50 rounded-lg p-2">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                      {displayNameFor(id)?.charAt(0) || '👤'}
                    </div>
                    <span className="flex-1 text-gray-700">{displayNameFor(id)}</span>
                    <span className="px-3 py-1 rounded bg-teal-50 text-teal-700 font-semibold">${splits[id].toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Por porcentaje */}
          {type === 'percent' && (
            <div>
              <div className="mb-2 text-gray-600">Dividir por porcentaje</div>
              {selectedParticipants.map(id => {
                const member = members.find(m => m.user_id === id);
                if (!member) return null;
                return (
                  <div key={id} className="flex items-center gap-3 mb-2 transition-all duration-200 bg-white hover:bg-blue-50 rounded-lg p-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                      {displayNameFor(id)?.charAt(0) || '👤'}
                    </div>
                    <span className="flex-1 text-gray-700">{displayNameFor(id)}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={percents[id]}
                      onChange={e => {
                        const val = Math.max(0, Math.min(100, Number(e.target.value)));
                        setPercents(prev => ({ ...prev, [id]: val }));
                        setSplits(prev => ({ ...prev, [id]: (amount * val) / 100 }));
                      }}
                      className="w-16 px-2 py-1 border rounded text-right"
                    />
                    <span className="px-2 text-gray-500">%</span>
                    <span className="px-3 py-1 rounded bg-blue-50 text-blue-700 font-semibold">${splits[id]?.toFixed(2) || '0.00'}</span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Por monto */}
          {type === 'custom' && (
            <div>
              <div className="mb-2 text-gray-600">Dividir por monto</div>
              {selectedParticipants.map(id => {
                const member = members.find(m => m.user_id === id);
                if (!member) return null;
                return (
                  <div key={id} className="flex items-center gap-3 mb-2 transition-all duration-200 bg-white hover:bg-green-50 rounded-lg p-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                      {displayNameFor(id)?.charAt(0) || '👤'}
                    </div>
                    <span className="flex-1 text-gray-700">{displayNameFor(id)}</span>
                    <input
                      type="number"
                      min={0}
                      value={splits[id]}
                      onChange={e => {
                        const val = Math.max(0, Number(e.target.value));
                        setSplits(prev => ({ ...prev, [id]: val }));
                      }}
                      className="w-20 px-2 py-1 border rounded text-right"
                    />
                    <span className="px-3 py-1 rounded bg-green-50 text-green-700 font-semibold">${splits[id]?.toFixed(2) || '0.00'}</span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Cada uno paga su parte */}
          {type === 'each' && (
            <div>
              <div className="mb-2 text-gray-600">Cada uno paga su parte</div>
              {selectedParticipants.map(id => {
                const member = members.find(m => m.user_id === id);
                if (!member) return null;
                return (
                  <div key={id} className="flex items-center gap-3 mb-2 transition-all duration-200 bg-white hover:bg-purple-50 rounded-lg p-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                      {displayNameFor(id)?.charAt(0) || '👤'}
                    </div>
                    <span className="flex-1 text-gray-700">{displayNameFor(id)}</span>
                    <input
                      type="number"
                      min={0}
                      value={splits[id]}
                      onChange={e => {
                        const val = Math.max(0, Number(e.target.value));
                        setSplits(prev => ({ ...prev, [id]: val }));
                      }}
                      className="w-20 px-2 py-1 border rounded text-right"
                    />
                    <span className="px-3 py-1 rounded bg-purple-50 text-purple-700 font-semibold">${splits[id]?.toFixed(2) || '0.00'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="pt-6 flex gap-3 flex-col sm:flex-row">
          <button onClick={onClose} className="w-full sm:w-auto py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
          <button
            onClick={() => onApply(splits, type)}
            className="w-full sm:w-auto py-3 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
