'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  type?: 'user' | 'system' | 'bid_notification' | 'auctioneer_call';
  timestamp: string;
}

interface LiveChatProps {
  socket: Socket | null;
  auctionId: string;
  userId: string;
  username: string;
}

export default function LiveChat({
  socket,
  auctionId,
  userId,
}: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('auctionJoined', (data) => {
      if (data.recentMessages) {
        setMessages(data.recentMessages);
      }
    });

    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-199), msg]);
    });

    socket.on('user-muted', (data) => {
      if (data.userId === userId) {
        setMessages((prev) => [
          ...prev,
          {
            id: `mute_${Date.now()}`,
            userId: 'system',
            username: 'Sistem',
            message: `${data.durationMinutes} dakika susturuldunuz.`,
            type: 'system',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    });

    return () => {
      socket.off('auctionJoined');
      socket.off('chat-message');
      socket.off('user-muted');
    };
  }, [socket, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || !socket) return;

    socket.emit('sendMessage', {
      auctionId,
      message: inputValue.trim(),
    });

    setInputValue('');
  }

  function getMessageStyle(type?: string) {
    switch (type) {
      case 'system':
        return 'text-yellow-400 italic';
      case 'bid_notification':
        return 'text-green-400 font-medium';
      case 'auctioneer_call':
        return 'text-red-400 font-bold';
      default:
        return 'text-gray-200';
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">Canlı Sohbet</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={getMessageStyle(msg.type)}>
            {msg.type !== 'system' && msg.type !== 'bid_notification' && msg.type !== 'auctioneer_call' ? (
              <>
                <span className="font-semibold text-blue-400 text-sm">
                  {msg.username}:
                </span>{' '}
                <span className="text-sm">{msg.message}</span>
              </>
            ) : (
              <span className="text-sm">{msg.message}</span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-2 border-t border-gray-700 flex gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Mesaj yazın..."
          maxLength={200}
          className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm px-4 py-2 rounded font-medium transition-colors"
        >
          Gönder
        </button>
      </form>
    </div>
  );
}
