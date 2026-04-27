import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';
import { UserProfile } from '@/src/types';
import L from 'leaflet';
import { Navigation, MapPin } from 'lucide-react';
import { handleFirestoreError, OperationType } from '@/src/utils/error';

// Fix for default leaflet icons
import markerIcon from 'leaflet/dist/images/marker-icon.png?url';
import markerShadow from 'leaflet/dist/images/marker-shadow.png?url';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationTracker() {
  useEffect(() => {
    if (!auth.currentUser) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
            lastLocation: {
              lat: latitude,
              lng: longitude,
              timestamp: new Date().toISOString()
            }
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser!.uid}`);
        }
      },
      (error) => console.error("Geolocation Error", error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return null;
}

function SetViewOnClick({ animateRef }: { animateRef: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (animateRef) {
       // logic to center on user if needed
    }
  }, [animateRef, map]);
  return null;
}

export function TeamMap() {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const users = snapshot.docs.map(d => d.data() as UserProfile);
        setMembers(users.filter(u => u.lastLocation));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="h-[400px] bg-indigo-50 animate-pulse rounded-3xl flex items-center justify-center text-indigo-300">Loading Map...</div>;

  return (
    <div className="relative h-[500px] w-full rounded-3xl overflow-hidden shadow-xl border border-white">
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {members.map((member) => (
          member.lastLocation && (
            <Marker key={member.uid} position={[member.lastLocation.lat, member.lastLocation.lng]}>
              <Popup>
                <div className="flex flex-col items-center">
                  <img src={member.photoURL} alt="" className="w-10 h-10 rounded-full mb-2" />
                  <p className="font-bold">{member.displayName}</p>
                  <p className="text-xs text-indigo-600 uppercase font-bold">{member.role}</p>
                  <p className="text-[10px] text-gray-400">Updated: {new Date(member.lastLocation.timestamp).toLocaleTimeString()}</p>
                </div>
              </Popup>
            </Marker>
          )
        ))}
        <LocationTracker />
      </MapContainer>
      
      <div className="absolute bottom-6 right-6 z-[1000]">
        <button className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-colors">
          <Navigation size={24} />
        </button>
      </div>

      <div className="absolute top-6 left-6 z-[1000] bg-white/90 backdrop-blur shadow-lg rounded-2xl p-4 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <MapPin size={16} className="text-indigo-600" />
          Live Team ({members.length})
        </h3>
        <div className="flex -space-x-2">
          {members.map(m => (
            <img key={m.uid} src={m.photoURL} className="w-8 h-8 rounded-full border-2 border-white" title={m.displayName} />
          ))}
        </div>
      </div>
    </div>
  );
}
