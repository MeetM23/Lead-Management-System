import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, Building2, TrendingUp } from 'lucide-react';

const testimonials = [
    {
        initials: "AK",
        name: "Aarav Kumar",
        role: "Sales Lead",
        quote: "Clear pipeline, faster updates. Our team finally has a system that gets out of the way.",
        stars: 5,
        bg: "bg-blue-100",
        text: "text-blue-600"
    },
    {
        initials: "MS",
        name: "Mira Shah",
        role: "Operations",
        quote: "Setup took minutes. We moved deals through stages without training.",
        stars: 5,
        bg: "bg-green-100",
        text: "text-green-600"
    },
    {
        initials: "RJ",
        name: "Rohan Joshi",
        role: "Account Exec",
        quote: "We track progress daily and never miss follow‑ups. It’s exactly what we needed.",
        stars: 5,
        bg: "bg-purple-100",
        text: "text-purple-600"
    }
];

const stats = [
    { label: "Teams Trusted", value: "2,000+", icon: <Building2 className="w-5 h-5 text-gray-400" /> },
    { label: "Conversion Lift", value: "+18%", icon: <TrendingUp className="w-5 h-5 text-green-500" /> },
];

const Testimonials = () => {
    return (
        <section id="testimonials" className="py-24 bg-gray-50/50 border-t border-gray-100 relative overflow-hidden scroll-mt-16">

            {/* Decorative background blob */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="container mx-auto px-6 md:px-12 relative z-10">

                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
                            Loved by teams <br /> who move fast.
                        </h2>

                        {/* Stats Pills */}
                        <div className="flex justify-center gap-6 mt-8">
                            {stats.map((stat, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm">
                                    {stat.icon}
                                    <div className="text-sm font-semibold text-gray-900">
                                        {stat.value} <span className="text-gray-500 font-normal ml-1">{stat.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Testimonials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {testimonials.map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <motion.div
                                    className="mb-6 text-blue-100"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    whileInView={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 + (idx * 0.1) }}
                                >
                                    <Quote className="w-8 h-8 fill-current text-blue-500/20" />
                                </motion.div>

                                <p className="text-lg text-gray-700 font-medium mb-6 leading-relaxed">
                                    "{item.quote}"
                                </p>

                                <div className="flex gap-1 mb-6">
                                    {[...Array(item.stars)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-6 border-t border-gray-50">
                                <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center font-bold text-sm ${item.text}`}>
                                    {item.initials}
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">{item.name}</div>
                                    <div className="text-sm text-gray-500">{item.role}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default Testimonials;
