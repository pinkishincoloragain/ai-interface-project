import React from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/shared';

export const LandingPage: React.FC = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
                <h1 className="text-5xl font-bold text-gray-900 mb-4">AI Interface</h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                    Experience the future of conversational AI with our advanced interface. Seamless interactions,
                    intelligent responses, and intuitive design.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="text-3xl mb-4">🚀</div>
                    <h3 className="text-lg font-semibold mb-2">Fast & Responsive</h3>
                    <p className="text-gray-600">Lightning-fast responses with real-time streaming capabilities.</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="text-3xl mb-4">🎯</div>
                    <h3 className="text-lg font-semibold mb-2">Intelligent</h3>
                    <p className="text-gray-600">
                        Advanced AI models that understand context and provide accurate answers.
                    </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="text-3xl mb-4">🔒</div>
                    <h3 className="text-lg font-semibold mb-2">Secure</h3>
                    <p className="text-gray-600">
                        Your conversations are private and secure with enterprise-grade protection.
                    </p>
                </div>
            </div>

            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
                <Link to="/chat">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg w-full sm:w-auto">
                        Start Chatting
                    </Button>
                </Link>

                <Link to="/settings">
                    <Button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-3 text-lg w-full sm:w-auto">
                        Settings
                    </Button>
                </Link>
            </div>
        </div>
    </div>
);
