import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";

const NavControls = () => {
    const navigate = useNavigate();

    return (
        <div className="flex items-start gap-2">
            {/* Back */}
            <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 transition" aria-label="Go Back">
                <ArrowLeft size={18} />
            </button>
            {/* Forward */}
            <button
                onClick={() => navigate(1)}
                className="p-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 transition" aria-label="Go Forward">
                <ArrowRight size={18} />
            </button>
        </div>
    )
}

export default NavControls;