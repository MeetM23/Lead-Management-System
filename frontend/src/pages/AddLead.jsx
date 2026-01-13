import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../context/LeadsContext';
import { Save, X } from 'lucide-react';
import gsap from 'gsap';

const AddLead = () => {
  const navigate = useNavigate();
  const { addLead } = useLeads();
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Website',
  });

  useEffect(() => {
    gsap.fromTo(formRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone) {
      alert("Please fill in all required fields (Name, Email, Phone)");
      return;
    }

    await addLead(formData);


    setFormData({
      name: '',
      email: '',
      phone: '',
      source: 'Website',
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-dark">Add New Lead</h1>
        <p className="text-gray-500 mt-1">Enter the details of the potential customer</p>
      </div>

      <div ref={formRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="Jane Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="(555) 123-4567"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="jane@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Lead Source</label>
            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white"
            >
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Cold Call">Cold Call</option>
              <option value="Advertisement">Advertisement</option>
            </select>
          </div>

          <div className="pt-4 flex items-center gap-4">

            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-violet-700 transition-colors shadow-lg shadow-primary/20">
              <Save size={18} />
              <span>Save Lead</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold py-3 px-8 rounded-lg hover:bg-gray-200 transition-colors">
              <X size={18} />
              <span>Cancel</span>
            </button>

          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLead;
