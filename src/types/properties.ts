export type PropertyType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'multi_select' 
  | 'date' 
  | 'person' 
  | 'checkbox' 
  | 'url' 
  | 'email' 
  | 'phone';

export interface PropertyValue {
  text?: string;
  number?: number;
  select?: string;
  multi_select?: string[];
  date?: string;
  person?: string;
  checkbox?: boolean;
  url?: string;
  email?: string;
  phone?: string;
}

export interface PageProperty {
  id: string;
  page_id: string;
  property_name: string;
  property_type: PropertyType;
  value: PropertyValue;
  created_at: string;
  updated_at: string;
}

export interface PropertyOption {
  id: string;
  name: string;
  color?: string;
}

export interface PropertyDefinition {
  name: string;
  type: PropertyType;
  options?: PropertyOption[];
  required?: boolean;
  description?: string;
}

export interface PropertyFormData {
  name: string;
  type: PropertyType;
  value: any;
}

// Helper functions for property values
export const getPropertyValue = (property: PageProperty): any => {
  switch (property.property_type) {
    case 'text':
      return property.value.text || '';
    case 'number':
      return property.value.number || 0;
    case 'select':
      return property.value.select || '';
    case 'multi_select':
      return property.value.multi_select || [];
    case 'date':
      return property.value.date || '';
    case 'person':
      return property.value.person || '';
    case 'checkbox':
      return property.value.checkbox || false;
    case 'url':
      return property.value.url || '';
    case 'email':
      return property.value.email || '';
    case 'phone':
      return property.value.phone || '';
    default:
      return '';
  }
};

export const setPropertyValue = (type: PropertyType, value: any): PropertyValue => {
  const result: PropertyValue = {};
  
  switch (type) {
    case 'text':
      result.text = value;
      break;
    case 'number':
      result.number = value;
      break;
    case 'select':
      result.select = value;
      break;
    case 'multi_select':
      result.multi_select = value;
      break;
    case 'date':
      result.date = value;
      break;
    case 'person':
      result.person = value;
      break;
    case 'checkbox':
      result.checkbox = value;
      break;
    case 'url':
      result.url = value;
      break;
    case 'email':
      result.email = value;
      break;
    case 'phone':
      result.phone = value;
      break;
  }
  
  return result;
};

export const formatPropertyValue = (property: PageProperty): string => {
  const value = getPropertyValue(property);
  
  switch (property.property_type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
      return value || '';
    case 'number':
      return value?.toString() || '0';
    case 'select':
      return value || '';
    case 'multi_select':
      return Array.isArray(value) ? value.join(', ') : '';
    case 'date':
      return value ? new Date(value).toLocaleDateString('pt-BR') : '';
    case 'person':
      return value || '';
    case 'checkbox':
      return value ? 'Sim' : 'Não';
    default:
      return '';
  }
};
