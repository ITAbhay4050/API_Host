// import { BellIcon } from 'lucide-react';
// import { motion } from 'framer-motion';
// import { useNotify } from '@/context/NotificationContext';

// export default function NotificationBell(){
//   const {count}=useNotify();
//   return(
//     <motion.button
//       className="relative p-2"
//       animate={{rotate:[0,15,-15,0]}}
//       transition={{repeat:count?Infinity:0, duration:0.6}}
//     >
//       <BellIcon className="w-6 h-6"/>
//       {count>0 && (
//         <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">
//           {count}
//         </span>
//       )}
//     </motion.button>
//   );
// }
