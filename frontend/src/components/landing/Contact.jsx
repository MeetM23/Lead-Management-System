import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Check } from 'lucide-react';

const Contact = () => {
    const handleSubmit = (e) => {
        e.preventDefault();
        alert('Message sent!');
    };
    return (
        <section id="cta" className="py-24 bg-white scroll-mt-16">
            <div className="container mx-auto px-6 md:px-12">
                <div className="bg-blue-600 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">

                    {/* Left Side: Info */}
                    <div className="lg:w-1/2 p-12 lg:p-16 text-white bg-blue-600 relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Scale?</h2>
                            <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                                Join thousands of teams who have transformed their sales process. Get meaningful insights and close more deals.
                            </p>

                            <div className="space-y-4 mb-12">
                                <div className="flex items-center gap-3 text-blue-100">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <span>hello@leadflow.app</span>
                                </div>
                                <div className="flex items-center gap-3 text-blue-100">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <span>+1 (888) 123-4567</span>
                                </div>
                                <div className="flex items-center gap-3 text-blue-100">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <span>San Francisco, CA</span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex -space-x-3">
                                    <div className="w-10 h-10 rounded-full border-2 border-blue-600 bg-gray-200" />
                                    <div className="w-10 h-10 rounded-full border-2 border-blue-600 bg-gray-300" />
                                    <div className="w-10 h-10 rounded-full border-2 border-blue-600 bg-gray-400" />
                                </div>
                                <div className="text-sm font-medium text-blue-100 flex flex-col justify-center">
                                    <span>Trusted by 2,000+ teams</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Form */}
                    <div className="lg:w-1/2 bg-white p-12 lg:p-16">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">First Name</label>
                                    <input type="text" placeholder="John" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Last Name</label>
                                    <input type="text" placeholder="Doe" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Email Address</label>
                                <input type="email" placeholder="john@company.com" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Message</label>
                                <textarea rows="4" placeholder="Tell us about your team..." className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none" required />
                            </div>

                            <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg">
                                Send Message
                            </button>

                            <p className="text-xs text-center text-gray-500">
                                By sending this message, you agree to our Terms and Privacy Policy.
                            </p>
                        </form>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Contact;
