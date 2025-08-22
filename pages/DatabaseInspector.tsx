import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../database';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';

const DatabaseInspector: React.FC = () => {
  const [dbData, setDbData] = useState<string>('{}');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    // Directly using the synchronous export method from the local db instance
    // No need for async/await here as the local api is synchronous
    const data = db.exportAllData();
    // Re-parse and stringify for consistent formatting (pretty-printing)
    setDbData(JSON.stringify(JSON.parse(data), null, 2)); 
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">فاحص قاعدة البيانات</h1>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-100 border border-gray-300 disabled:opacity-50"
        >
          <RefreshCw size={16} className={`ml-2 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث البيانات
        </button>
      </div>

      <Card title="تحذير">
        <div className="flex items-start p-4 text-sm text-yellow-800 bg-yellow-50 rounded-lg border border-yellow-200">
          <AlertTriangle className="flex-shrink-0 w-5 h-5 ml-3" />
          <div className="flex-1">
            <p>
              هذه الصفحة مخصصة للمطورين ولأغراض التشخيص المتقدمة. تعرض هذه الصفحة النسخة الخام الكاملة من قاعدة البيانات المخزنة محليًا في متصفحك.
            </p>
          </div>
        </div>
      </Card>

      <Card title="محتويات قاعدة البيانات (JSON)">
        <div className="bg-gray-900 text-white p-4 rounded-md overflow-auto max-h-[70vh] text-left" dir="ltr">
          <pre>
            <code>
              {isLoading ? '...جاري التحميل' : dbData}
            </code>
          </pre>
        </div>
      </Card>
    </div>
  );
};

export default DatabaseInspector;
