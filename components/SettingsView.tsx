import React from 'react';
import { Save, Bell, Shield, Wallet, Mail } from 'lucide-react';

const SettingsView: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-display font-bold text-charcoal">System Settings</h2>
        <p className="text-sm text-gray-500">Manage automation rules and company preferences.</p>
      </div>

      {/* Budget Section */}
      <section className="bg-white border-2 border-charcoal p-6 shadow-[6px_6px_0px_#1A1E1C]">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-100 pb-4">
            <div className="p-2 bg-lime border border-charcoal">
                <Wallet className="w-5 h-5 text-charcoal" />
            </div>
            <h3 className="text-lg font-bold">Budget & Limits</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Monthly Soft Cap (€)</label>
                <input type="number" defaultValue={5000} className="w-full p-3 bg-cream border-2 border-charcoal focus:ring-2 focus:ring-lime focus:outline-none font-mono" />
                <p className="text-xs text-gray-500 mt-1">Manager approval required if exceeded.</p>
            </div>
            <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Auto-Approve Limit (€)</label>
                <input type="number" defaultValue={50} className="w-full p-3 bg-cream border-2 border-charcoal focus:ring-2 focus:ring-lime focus:outline-none font-mono" />
                <p className="text-xs text-gray-500 mt-1">Requests under this amount skip approval.</p>
            </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white border-2 border-charcoal p-6 shadow-[6px_6px_0px_#1A1E1C]">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-100 pb-4">
            <div className="p-2 bg-forest border border-charcoal">
                <Bell className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold">Notifications</h3>
        </div>

        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-bold text-charcoal">Email Digest</p>
                    <p className="text-xs text-gray-500">Receive a daily summary of savings.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none border-2 border-charcoal peer-checked:bg-forest"></div>
                    <div className="absolute left-[4px] top-[4px] bg-white border border-charcoal w-4 h-4 transition-all peer-checked:translate-x-full"></div>
                </label>
            </div>
             <div className="flex items-center justify-between">
                <div>
                    <p className="font-bold text-charcoal">Slack Integration</p>
                    <p className="text-xs text-gray-500">Post approvals to #procurement channel.</p>
                </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none border-2 border-charcoal peer-checked:bg-forest"></div>
                    <div className="absolute left-[4px] top-[4px] bg-white border border-charcoal w-4 h-4 transition-all peer-checked:translate-x-full"></div>
                </label>
            </div>
        </div>
      </section>

      {/* Ingestion */}
      <section className="bg-white border-2 border-charcoal p-6 shadow-[6px_6px_0px_#1A1E1C] opacity-75">
         <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-100 pb-4">
            <div className="p-2 bg-charcoal border border-charcoal">
                <Mail className="w-5 h-5 text-lime" />
            </div>
            <h3 className="text-lg font-bold">Email Ingestion (Legacy)</h3>
        </div>
        <div className="bg-cream border border-charcoal p-4 font-mono text-sm break-all">
            forwarding-address-x829@procurebot.ai
        </div>
         <p className="text-xs text-gray-500 mt-2">Forward employee requests to this address to trigger the AI agent.</p>
      </section>

      <div className="flex justify-end">
          <button className="bg-lime text-charcoal font-bold px-8 py-4 border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2">
              <Save className="w-5 h-5" /> Save Changes
          </button>
      </div>
    </div>
  );
};

export default SettingsView;