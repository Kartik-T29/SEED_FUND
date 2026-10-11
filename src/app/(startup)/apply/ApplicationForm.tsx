'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { saveDraftAction, submitApplicationAction } from './actions';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApplicationForm({ application }: { application: any }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState(application.formData || {});
  const [grantType, setGrantType] = useState(application.grantType || '');
  const [budgetItems, setBudgetItems] = useState<any[]>(application.budgetItems || []);
  
  const requestedTotal = budgetItems.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setSaving(true);
      await saveDraftAction(application.id, {
        formData,
        grantType,
        requestedTotal,
        budgetItems
      });
      setSaving(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, grantType, budgetItems, requestedTotal, application.id]);

  const addBudgetItem = () => {
    setBudgetItems([...budgetItems, { header: '', name: '', vendor: '', unitCost: 0, qty: 1, total: 0, justification: '' }]);
  };

  const updateBudgetItem = (index: number, field: string, value: any) => {
    const newItems = [...budgetItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'unitCost' || field === 'qty') {
      newItems[index].total = (parseFloat(newItems[index].unitCost || 0) * parseInt(newItems[index].qty || 1)).toFixed(2);
    }
    setBudgetItems(newItems);
  };

  const removeBudgetItem = (index: number) => {
    setBudgetItems(budgetItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    await saveDraftAction(application.id, { formData, grantType, requestedTotal, budgetItems });
    await submitApplicationAction(application.id);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seed Fund Application</h1>
          <p className="text-gray-500 mt-1">Step {step} of 3</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Saved'}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Basic Information'}
            {step === 2 && 'Budget Details'}
            {step === 3 && 'Review & Submit'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {step === 1 && (
              <div className="space-y-4">
                <Select
                  label="Grant Type"
                  name="grantType"
                  value={grantType}
                  onChange={(e: any) => setGrantType(e.target.value)}
                  options={[
                    { value: 'IDEATION', label: 'Ideation (₹1,000–5,000)' },
                    { value: 'VALIDATION', label: 'Validation (₹5,000–20,000)' },
                    { value: 'PROOF', label: 'Proof (₹25,000–50,000)' },
                    { value: 'SCALING', label: 'Scaling (₹50,000–5,00,000)' },
                    { value: 'EMERGENCY', label: 'Emergency' },
                  ]}
                  required
                />
                
                <Input
                  label="Problem Statement"
                  name="problemStatement"
                  value={formData.problemStatement || ''}
                  onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                  required
                />
                
                <Textarea
                  label="Proposed Solution"
                  name="proposedSolution"
                  value={formData.proposedSolution || ''}
                  onChange={(e) => setFormData({ ...formData, proposedSolution: e.target.value })}
                  required
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Budget Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addBudgetItem}>Add Item</Button>
                </div>
                
                <div className="space-y-4">
                  {budgetItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                      <div className="col-span-3">
                        <Input label="Item Name" value={item.name} onChange={(e) => updateBudgetItem(i, 'name', e.target.value)} required />
                      </div>
                      <div className="col-span-2">
                        <Input label="Header" value={item.header} onChange={(e) => updateBudgetItem(i, 'header', e.target.value)} required />
                      </div>
                      <div className="col-span-2">
                        <Input label="Unit Cost" type="number" value={item.unitCost} onChange={(e) => updateBudgetItem(i, 'unitCost', e.target.value)} required />
                      </div>
                      <div className="col-span-1">
                        <Input label="Qty" type="number" value={item.qty} onChange={(e) => updateBudgetItem(i, 'qty', e.target.value)} required />
                      </div>
                      <div className="col-span-2">
                        <Input label="Total" type="number" value={item.total} readOnly disabled />
                      </div>
                      <div className="col-span-2">
                        <Button type="button" variant="danger" size="sm" onClick={() => removeBudgetItem(i)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right font-bold text-lg mt-4">
                  Requested Total: ₹{requestedTotal.toFixed(2)}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p><strong>Grant Type:</strong> {grantType}</p>
                  <p><strong>Total Requested:</strong> ₹{requestedTotal.toFixed(2)}</p>
                  <p><strong>Items:</strong> {budgetItems.length}</p>
                </div>
                <div className="flex items-center gap-2 pt-4 border-t">
                  <input type="checkbox" id="declaration" name="declaration" required className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                  <label htmlFor="declaration" className="text-sm text-gray-700">
                    I declare that the information provided is correct and I accept the terms.
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
              ) : <div></div>}
              <Button type="submit">
                {step < 3 ? 'Next' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
